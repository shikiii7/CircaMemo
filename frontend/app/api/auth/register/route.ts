import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  mapUserRow,
  purgeExpiredSessions,
  setSessionCookie,
} from "@/lib/auth/session";
import { validateRegistration } from "@/lib/auth/validation";

type AccountRow = {
  id: string | number;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: Date;
  last_login_at: Date | null;
};

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式不正确" },
      { status: 400 },
    );
  }

  const parsed = validateRegistration(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: "请检查填写内容", errors: parsed.errors },
      { status: 400 },
    );
  }

  const { email, displayName, password } = parsed.value;

  try {
    const existing = await pool.query(
      "SELECT 1 FROM app.user_account WHERE email = $1",
      [email],
    );
    if (existing.rowCount) {
      return NextResponse.json(
        {
          success: false,
          error: "该邮箱已注册，请直接登录",
          errors: { email: "该邮箱已注册" },
        },
        { status: 409 },
      );
    }

    // 首个注册账号自动成为管理员，便于打开后台管理系统
    const countResult = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM app.user_account",
    );
    const isFirstUser = countResult.rows[0]?.total === "0";

    const passwordHash = await hashPassword(password);
    const inserted = await pool.query<AccountRow>(
      `INSERT INTO app.user_account (email, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, role, status, created_at, last_login_at`,
      [email, displayName, passwordHash, isFirstUser ? "admin" : "user"],
    );

    const row = inserted.rows[0];
    const user = mapUserRow(row);
    const { token, expiresAt } = await createSession(
      user.id,
      request.headers.get("user-agent"),
    );
    await setSessionCookie(token, expiresAt);
    await purgeExpiredSessions();

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("register api error:", error);
    return NextResponse.json(
      { success: false, error: "注册失败，请稍后重试" },
      { status: 500 },
    );
  }
}
