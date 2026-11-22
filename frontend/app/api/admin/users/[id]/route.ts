import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { mapUserRow, requireAdmin } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

type AccountRow = {
  id: string | number;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: Date;
  last_login_at: Date | null;
};

/** 后台调整用户状态与角色。 */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return NextResponse.json({ success: false, error: "用户不存在" }, { status: 400 });
  }

  let payload: { status?: unknown; role?: unknown };
  try {
    payload = (await request.json()) as { status?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确" }, { status: 400 });
  }

  const nextStatus =
    payload.status === undefined ? null : payload.status === "disabled" ? "disabled" : "active";
  const nextRole =
    payload.role === undefined ? null : payload.role === "admin" ? "admin" : "user";

  if (nextStatus === null && nextRole === null) {
    return NextResponse.json(
      { success: false, error: "没有需要更新的字段" },
      { status: 400 },
    );
  }

  if (targetId === admin.id) {
    if (nextStatus === "disabled") {
      return NextResponse.json(
        { success: false, error: "不能停用当前登录的管理员账号" },
        { status: 400 },
      );
    }
    if (nextRole === "user") {
      return NextResponse.json(
        { success: false, error: "不能取消自己的管理员权限" },
        { status: 400 },
      );
    }
  }

  try {
    const updated = await pool.query<AccountRow>(
      `UPDATE app.user_account
          SET status = COALESCE($2, status),
              role = COALESCE($3, role),
              updated_at = now()
        WHERE id = $1
        RETURNING id, email, display_name, role, status, created_at, last_login_at`,
      [targetId, nextStatus, nextRole],
    );
    const row = updated.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });
    }

    // 停用账号时立即失效其全部会话
    if (nextStatus === "disabled") {
      await pool.query("DELETE FROM app.user_session WHERE user_id = $1", [targetId]);
    }

    return NextResponse.json({ success: true, user: mapUserRow(row) });
  } catch (error) {
    console.error("admin users PATCH error:", error);
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}
