import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readImageFile } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

type ImageRow = {
  storage_key: string;
  mime_type: string;
  content_status: string;
  owner_id: string;
};

/** 用户录入图片的读取入口：公开记录任何人可读，隐藏记录仅本人与管理员可读。 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const imageId = Number(id);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return NextResponse.json({ success: false, error: "图片不存在" }, { status: 400 });
  }

  try {
    const result = await pool.query<ImageRow>(
      `SELECT i.storage_key, i.mime_type, c.status AS content_status,
              c.user_id AS owner_id
         FROM app.user_content_image i
         JOIN app.user_content c ON c.id = i.content_id
        WHERE i.id = $1`,
      [imageId],
    );
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: "图片不存在" }, { status: 404 });
    }

    let isVisible = row.content_status === "published";
    if (!isVisible) {
      const viewer = await getCurrentUser();
      isVisible =
        Boolean(viewer) &&
        (viewer!.role === "admin" || viewer!.id === Number(row.owner_id));
    }
    if (!isVisible) {
      return NextResponse.json({ success: false, error: "图片不可访问" }, { status: 404 });
    }

    const bytes = await readImageFile(row.storage_key);
    if (!bytes) {
      return NextResponse.json({ success: false, error: "图片文件缺失" }, { status: 404 });
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": row.mime_type,
        "content-length": String(bytes.byteLength),
        "cache-control":
          row.content_status === "published"
            ? "public, max-age=86400"
            : "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("media api error:", error);
    return NextResponse.json({ success: false, error: "读取图片失败" }, { status: 500 });
  }
}
