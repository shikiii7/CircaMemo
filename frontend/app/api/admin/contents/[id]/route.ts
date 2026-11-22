import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getUploadRoot } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]): Promise<number | null> {
  const { id } = await params;
  const contentId = Number(id);
  return Number.isInteger(contentId) && contentId > 0 ? contentId : null;
}

/** 后台隐藏 / 恢复某条用户记录。 */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
  }

  const contentId = await parseId(params);
  if (!contentId) {
    return NextResponse.json({ success: false, error: "记录不存在" }, { status: 400 });
  }

  let payload: { status?: unknown };
  try {
    payload = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确" }, { status: 400 });
  }

  const status =
    payload.status === "hidden" ? "hidden" : payload.status === "published" ? "published" : null;
  if (!status) {
    return NextResponse.json({ success: false, error: "状态不合法" }, { status: 400 });
  }

  try {
    const updated = await pool.query(
      `UPDATE app.user_content
          SET status = $2, updated_at = now()
        WHERE id = $1
        RETURNING id, status`,
      [contentId, status],
    );
    if (updated.rowCount === 0) {
      return NextResponse.json({ success: false, error: "记录不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("admin contents PATCH error:", error);
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}

/** 后台删除某条用户记录（含图片文件）。 */
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
  }

  const contentId = await parseId(params);
  if (!contentId) {
    return NextResponse.json({ success: false, error: "记录不存在" }, { status: 400 });
  }

  try {
    const images = await pool.query<{ storage_key: string }>(
      "SELECT storage_key FROM app.user_content_image WHERE content_id = $1",
      [contentId],
    );
    await pool.query("DELETE FROM app.user_content WHERE id = $1", [contentId]);
    await Promise.all(
      images.rows.map((image) =>
        unlink(path.join(getUploadRoot(), image.storage_key)).catch(() => undefined),
      ),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin contents DELETE error:", error);
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
