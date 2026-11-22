import { pool } from "@/lib/db";

export type UserContentImage = {
  id: number;
  url: string;
};

export type UserContentItem = {
  id: number;
  userId: number;
  heritagePid: string;
  heritageName: string;
  title: string | null;
  body: string;
  status: "published" | "hidden";
  createdAt: string;
  images: UserContentImage[];
};

type ContentRow = {
  id: string | number;
  user_id: string | number;
  heritage_pid: string;
  heritage_name: string;
  title: string | null;
  body: string;
  status: string;
  created_at: Date | string;
};

type ImageRow = {
  id: string | number;
  content_id: string | number;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

async function attachImages(
  rows: ContentRow[],
): Promise<UserContentItem[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => Number(row.id));
  const imageResult = await pool.query<ImageRow>(
    `SELECT id, content_id
       FROM app.user_content_image
      WHERE content_id = ANY($1::bigint[])
      ORDER BY id`,
    [ids],
  );

  const imagesByContent = new Map<number, UserContentImage[]>();
  for (const image of imageResult.rows) {
    const contentId = Number(image.content_id);
    const list = imagesByContent.get(contentId) ?? [];
    list.push({ id: Number(image.id), url: `/api/media/${Number(image.id)}` });
    imagesByContent.set(contentId, list);
  }

  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    heritagePid: row.heritage_pid,
    heritageName: row.heritage_name,
    title: row.title,
    body: row.body,
    status: row.status === "hidden" ? "hidden" : "published",
    createdAt: toIso(row.created_at),
    images: imagesByContent.get(Number(row.id)) ?? [],
  }));
}

const CONTENT_COLUMNS = `c.id, c.user_id, c.heritage_pid, c.heritage_name,
                         c.title, c.body, c.status, c.created_at`;

export async function listUserContents(
  userId: number,
): Promise<UserContentItem[]> {
  const result = await pool.query<ContentRow>(
    `SELECT ${CONTENT_COLUMNS}
       FROM app.user_content c
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT 200`,
    [userId],
  );
  return attachImages(result.rows);
}

export type AdminContentItem = UserContentItem & {
  ownerName: string;
  ownerEmail: string;
};

export async function listAllContents(): Promise<AdminContentItem[]> {
  const result = await pool.query<ContentRow & { display_name: string; email: string }>(
    `SELECT ${CONTENT_COLUMNS}, u.display_name, u.email
       FROM app.user_content c
       JOIN app.user_account u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT 300`,
  );
  const withImages = await attachImages(result.rows);
  return withImages.map((item, index) => ({
    ...item,
    ownerName: result.rows[index].display_name,
    ownerEmail: result.rows[index].email,
  }));
}

export type PublicContentItem = UserContentItem & {
  ownerName: string;
};

/** 某文保点下所有公开的用户记录（预留给地图侧展示）。 */
export async function listPublishedContentsByHeritage(
  heritagePid: string,
): Promise<PublicContentItem[]> {
  const result = await pool.query<ContentRow & { display_name: string }>(
    `SELECT ${CONTENT_COLUMNS}, u.display_name
       FROM app.user_content c
       JOIN app.user_account u ON u.id = c.user_id
      WHERE c.heritage_pid = $1
        AND c.status = 'published'
      ORDER BY c.created_at DESC
      LIMIT 100`,
    [heritagePid],
  );
  const withImages = await attachImages(result.rows);
  return withImages.map((item, index) => ({
    ...item,
    ownerName: result.rows[index].display_name,
  }));
}
