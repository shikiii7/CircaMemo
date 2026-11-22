import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getUploadRoot } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

/** 删除自己录入的记录（管理员可删除任意记录）。 */
export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const contentId = Number(id);
  if (!Number.isInteger(contentId) || contentId <= 0) {
    return NextResponse.json({ success: false, error: "记录不存在" }, { status: 400 });
  }

  try {
    const ownership = await pool.query<{ user_id: string }>(
      "SELECT user_id FROM app.user_content WHERE id = $1",
      [contentId],
    );
    const row = ownership.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: "记录不存在" }, { status: 404 });
    }
    if (Number(row.user_id) !== user.id && user.role !== "admin") {
      return NextResponse.json({ success: false, error: "无权删除该记录" }, { status: 403 });
    }

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
    console.error("user-contents DELETE error:", error);
    return NextResponse.json({ success: false, error: "删除失败" }, { status: 500 });
  }
}
