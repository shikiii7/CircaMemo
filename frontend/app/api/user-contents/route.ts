import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_BODY_MAX_LENGTH,
} from "@/lib/auth/validation";
import {
  MAX_IMAGES_PER_CONTENT,
  getUploadRoot,
  saveImageFile,
  type SavedImage,
} from "@/lib/uploads";
import { listUserContents } from "@/lib/userContent";

function readString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "请先登录" },
      { status: 401 },
    );
  }

  try {
    const data = await listUserContents(user.id);
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("user-contents GET error:", error);
    return NextResponse.json(
      { success: false, error: "读取记录失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "请先登录" },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式不正确" },
      { status: 400 },
    );
  }

  const heritagePid = readString(form, "heritagePid").trim();
  const title = readString(form, "title").trim();
  const body = readString(form, "body").trim();

  if (!heritagePid) {
    return NextResponse.json(
      { success: false, error: "请选择文保点", errors: { heritagePid: "请选择文保点" } },
      { status: 400 },
    );
  }
  if (!body) {
    return NextResponse.json(
      { success: false, error: "请填写文字内容", errors: { body: "请填写文字内容" } },
      { status: 400 },
    );
  }
  if (body.length > CONTENT_BODY_MAX_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: "文字内容过长",
        errors: { body: `文字内容不能超过 ${CONTENT_BODY_MAX_LENGTH} 字` },
      },
      { status: 400 },
    );
  }
  if (title.length > CONTENT_TITLE_MAX_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: "标题过长",
        errors: { title: `标题不能超过 ${CONTENT_TITLE_MAX_LENGTH} 字` },
      },
      { status: 400 },
    );
  }

  // 文保点名称以数据库为准，避免前端伪造
  let heritageName: string;
  try {
    const heritage = await pool.query<{ name: string | null }>(
      "SELECT name FROM app.p2_heritagefull_xian WHERE pid = $1",
      [heritagePid],
    );
    if (heritage.rowCount === 0 || !heritage.rows[0].name) {
      return NextResponse.json(
        {
          success: false,
          error: "文保点不存在，请重新选择",
          errors: { heritagePid: "文保点不存在" },
        },
        { status: 400 },
      );
    }
    heritageName = heritage.rows[0].name;
  } catch (error) {
    console.error("user-contents heritage lookup error:", error);
    return NextResponse.json(
      { success: false, error: "校验文保点失败" },
      { status: 500 },
    );
  }

  const uploaded = form
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (uploaded.length > MAX_IMAGES_PER_CONTENT) {
    return NextResponse.json(
      {
        success: false,
        error: `最多上传 ${MAX_IMAGES_PER_CONTENT} 张图片`,
        errors: { images: `最多上传 ${MAX_IMAGES_PER_CONTENT} 张图片` },
      },
      { status: 400 },
    );
  }

  const saved: SavedImage[] = [];
  try {
    for (const file of uploaded) {
      saved.push(await saveImageFile(file));
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const contentResult = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO app.user_content
           (user_id, heritage_pid, heritage_name, title, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [user.id, heritagePid, heritageName, title || null, body],
      );
      const contentId = contentResult.rows[0].id;

      const images: { id: string }[] = [];
      for (const image of saved) {
        const imageResult = await client.query<{ id: string }>(
          `INSERT INTO app.user_content_image
             (content_id, storage_key, mime_type, byte_size)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [contentId, image.storageKey, image.mimeType, image.byteSize],
        );
        images.push(imageResult.rows[0]);
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          data: {
            id: Number(contentId),
            heritagePid,
            heritageName,
            title: title || null,
            body,
            status: "published",
            createdAt: new Date(contentResult.rows[0].created_at).toISOString(),
            images: images.map((image) => ({
              id: Number(image.id),
              url: `/api/media/${Number(image.id)}`,
            })),
          },
        },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    // 数据库写入失败时清理已落盘的图片，避免产生孤儿文件
    await Promise.all(
      saved.map((image) =>
        unlink(path.join(getUploadRoot(), image.storageKey)).catch(() => undefined),
      ),
    );

    const message =
      error instanceof Error && /图片|仅支持/.test(error.message)
        ? error.message
        : "保存失败，请稍后重试";
    console.error("user-contents POST error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: message === "保存失败，请稍后重试" ? 500 : 400 },
    );
  }
}
