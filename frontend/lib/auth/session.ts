import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import type { AuthUser } from "@/lib/auth/validation";

export type { AuthUser } from "@/lib/auth/validation";

export const SESSION_COOKIE = "circamemo_session";
export const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

type UserRow = {
  id: string | number;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: Date | string | null;
  last_login_at: Date | string | null;
};

export function mapUserRow(row: UserRow): AuthUser {
  return {
    id: Number(row.id),
    email: row.email,
    displayName: row.display_name,
    role: row.role === "admin" ? "admin" : "user",
    status: row.status === "disabled" ? "disabled" : "active",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type CreatedSession = { token: string; expiresAt: Date };

/** 生成会话记录：cookie 里放随机 token，数据库只存其 sha256。 */
export async function createSession(
  userId: number,
  userAgent?: string | null,
): Promise<CreatedSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await pool.query(
    `INSERT INTO app.user_session (token_hash, user_id, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [hashToken(token), userId, expiresAt, userAgent?.slice(0, 300) ?? null],
  );

  return { token, expiresAt };
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** 读取当前请求的登录用户；未登录、已过期或账号被禁用时返回 null。 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const result = await pool.query<UserRow>(
      `SELECT u.id, u.email, u.display_name, u.role, u.status,
              u.created_at, u.last_login_at
         FROM app.user_session s
         JOIN app.user_account u ON u.id = s.user_id
        WHERE s.token_hash = $1
          AND s.expires_at > now()
          AND u.status = 'active'`,
      [hashToken(token)],
    );
    const row = result.rows[0];
    return row ? mapUserRow(row) : null;
  } catch (error) {
    console.error("getCurrentUser failed:", error);
    return null;
  }
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}

/** 注销：删除会话记录并清 cookie。 */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await pool.query("DELETE FROM app.user_session WHERE token_hash = $1", [
        hashToken(token),
      ]);
    } catch (error) {
      console.error("destroyCurrentSession failed:", error);
    }
  }
  store.delete(SESSION_COOKIE);
}

/** 清理过期会话，可在登录时顺带调用，避免会话表无限增长。 */
export async function purgeExpiredSessions(): Promise<void> {
  try {
    await pool.query("DELETE FROM app.user_session WHERE expires_at < now()");
  } catch (error) {
    console.error("purgeExpiredSessions failed:", error);
  }
}
