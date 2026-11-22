import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  mapUserRow,
  purgeExpiredSessions,
  setSessionCookie,
} from "@/lib/auth/session";
import { validateLogin } from "@/lib/auth/validation";

type LoginRow = {
  id: string | number;
  email: string;
  display_name: string;
  password_hash: string;
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

  const parsed = validateLogin(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: "请检查填写内容", errors: parsed.errors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.value;

  try {
    const result = await pool.query<LoginRow>(
      `SELECT id, email, display_name, password_hash, role, status,
              created_at, last_login_at
         FROM app.user_account
        WHERE email = $1`,
      [email],
    );
    const row = result.rows[0];
    const passwordOk = row
      ? await verifyPassword(password, row.password_hash)
      : false;

    if (!row || !passwordOk) {
      return NextResponse.json(
        { success: false, error: "邮箱或密码不正确" },
        { status: 401 },
      );
    }

    if (row.status === "disabled") {
      return NextResponse.json(
        { success: false, error: "该账号已被停用，请联系管理员" },
        { status: 403 },
      );
    }

    const updated = await pool.query<LoginRow>(
      `UPDATE app.user_account
          SET last_login_at = now()
        WHERE id = $1
        RETURNING id, email, display_name, password_hash, role, status,
                  created_at, last_login_at`,
      [row.id],
    );
    const user = mapUserRow(updated.rows[0] ?? row);

    const { token, expiresAt } = await createSession(
      user.id,
      request.headers.get("user-agent"),
    );
    await setSessionCookie(token, expiresAt);
    await purgeExpiredSessions();

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("login api error:", error);
    return NextResponse.json(
      { success: false, error: "登录失败，请稍后重试" },
      { status: 500 },
    );
  }
}
