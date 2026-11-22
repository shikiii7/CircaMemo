import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// 唐长安 108 坊（app.a5_tang108fang，120 个面要素）
export async function GET() {
  try {
    const sql = `
      SELECT
        objectid AS id,
        name,
        intro,
        fid,
        count_pid,
        district AS district_name,
        ST_AsGeoJSON(geom)::json AS geometry
      FROM app.a5_tang108fang
      ORDER BY objectid;
    `;

    const result = await pool.query(sql);

    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map((row) => ({
        type: "Feature",
        geometry: row.geometry,
        properties: {
          id: row.id,
          name: row.name,
          intro: row.intro,
          fid: row.fid,
          count_pid: row.count_pid,
          district_name: row.district_name,
        },
      })),
    };

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      data: geojson,
    });
  } catch (error) {
    console.error("tang-fang-areas api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load Tang fang areas" },
      { status: 500 }
    );
  }
}
