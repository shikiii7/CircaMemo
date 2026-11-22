import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// 国家级非遗空间汇总：同名项目·跨市连线
// 返回每个跨市/省同名项目所涉及的所有原始点位坐标，
// 前端直接在同名点之间画连线。

export async function GET() {
  try {
    const sql = `
      WITH cross_city_projects AS (
        SELECT name_cn
        FROM app.p4_nmh
        WHERE geom IS NOT NULL
          AND name_cn IS NOT NULL
          AND city IS NOT NULL
        GROUP BY name_cn
        HAVING COUNT(DISTINCT city) > 1
      )
      SELECT
        p.name_cn AS name,
        MODE() WITHIN GROUP (ORDER BY p.categorycn) AS category,
        jsonb_agg(
          jsonb_build_object(
            'lng', round(ST_X(p.geom)::numeric, 6),
            'lat', round(ST_Y(p.geom)::numeric, 6)
          )
        ) AS points
      FROM app.p4_nmh p
      JOIN cross_city_projects ccp ON p.name_cn = ccp.name_cn
      WHERE p.geom IS NOT NULL
      GROUP BY p.name_cn
      ORDER BY p.name_cn;
    `;

    const result = await pool.query(sql);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("ich-city-summary api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load ICH city summary" },
      { status: 500 },
    );
  }
}
