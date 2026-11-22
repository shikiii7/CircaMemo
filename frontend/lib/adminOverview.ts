import { pool } from "@/lib/db";
import { mapUserRow, type AuthUser } from "@/lib/auth/session";
import { listAllContents, type AdminContentItem } from "@/lib/userContent";

export type AdminUserRow = AuthUser & { contentCount: number };

export type AdminOverview = {
  stats: {
    userCount: number;
    activeUserCount: number;
    adminCount: number;
    contentCount: number;
    hiddenContentCount: number;
    imageCount: number;
  };
  users: AdminUserRow[];
  contents: AdminContentItem[];
};

type UserListRow = {
  id: string | number;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: Date;
  last_login_at: Date | null;
  content_count: number;
};

export async function loadAdminOverview(): Promise<AdminOverview> {
  const users = await pool.query<UserListRow>(
    `SELECT u.id, u.email, u.display_name, u.role, u.status,
            u.created_at, u.last_login_at,
            (SELECT count(*)::int FROM app.user_content c WHERE c.user_id = u.id)
              AS content_count
       FROM app.user_account u
      ORDER BY u.created_at DESC`,
  );
  const contents = await listAllContents();

  const userRows: AdminUserRow[] = users.rows.map((row) => ({
    ...mapUserRow(row),
    contentCount: row.content_count,
  }));

  return {
    stats: {
      userCount: userRows.length,
      activeUserCount: userRows.filter((user) => user.status === "active").length,
      adminCount: userRows.filter((user) => user.role === "admin").length,
      contentCount: contents.length,
      hiddenContentCount: contents.filter((item) => item.status === "hidden").length,
      imageCount: contents.reduce((total, item) => total + item.images.length, 0),
    },
    users: userRows,
    contents,
  };
}
