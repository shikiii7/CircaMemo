import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { convertNationalHeritagePointTemporalFields } from "./temporal";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

// 列表只返回绘制所需字段；简介在点击后通过 ?id= 按需读取。
export async function GET(request?: Request) {
  const detailId = request ? new URL(request.url).searchParams.get("id") : null;
  if (detailId !== null && !/^\d+$/.test(detailId)) {
    return NextResponse.json(
      { success: false, error: "Invalid national heritage point id" },
      { status: 400 },
    );
  }

  try {
    const sql = `
      SELECT
          p.objectid    AS id,
          p.name_nh     AS name,
          p.period_nh   AS period,
          p.type_nh     AS type,
          p.batch_nh    AS batch,
          ${detailId !== null ? "p.intro_nh AS intro," : ""}
          p.province_nh AS province,
          p.city,
          p.district,
          ST_X(p.geom)  AS lng,
          ST_Y(p.geom)  AS lat,
          p.time_start_nh AS time_start,
          p.time_end_nh   AS time_end
      FROM app.p1_nh p
      WHERE p.geom IS NOT NULL
      ${detailId !== null ? "AND p.objectid = $1" : ""}
      ORDER BY p.objectid;
    `;

    const result = await pool.query(sql, detailId !== null ? [detailId] : []);
    const data = result.rows.map((row) => {
      const temporal = convertNationalHeritagePointTemporalFields(
        { time_start: row.time_start, time_end: row.time_end },
        row.id,
      );

      for (const issue of temporal.issues) {
        console.error(issue);
      }

      return { ...row, ...temporal.fields };
    });

    if (detailId !== null && data.length === 0) {
      return NextResponse.json(
        { success: false, error: "National heritage point not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        data: detailId !== null ? data[0] : data,
      },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    console.error("national-heritage-points api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load national heritage points" },
      { status: 500 }
    );
  }
}
