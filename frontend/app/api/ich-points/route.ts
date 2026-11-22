import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// 国家级非物质文化遗产代表性项目（app.p4_nmh，全国范围点数据，约 3630 条）
export async function GET() {
  try {
    const sql = `
      SELECT
          p.objectid   AS id,
          p.name_cn    AS name,
          p.categorycn AS category,
          p.cover_image_key,
          p.province,
          p.city,
          p.district,
          ST_X(p.geom) AS lng,
          ST_Y(p.geom) AS lat
      FROM app.p4_nmh p
      WHERE p.geom IS NOT NULL
      ORDER BY p.objectid;
    `;

    const result = await pool.query(sql);

    return NextResponse.json(
      {
        success: true,
        count: result.rows.length,
        data: result.rows,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("ich-points api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load ICH points" },
      { status: 500 }
    );
  }
}
