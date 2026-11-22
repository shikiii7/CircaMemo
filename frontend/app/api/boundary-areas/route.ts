import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// 行政边界（天地图数据）：省 / 市 / 区县三级
// GET /api/boundary-areas?level=province|city|district
const LEVEL_TABLES: Record<string, string> = {
  province: "app.a1_bndry_province_tiandi",
  city: "app.a2_bndry_city_tiandi",
  district: "app.a3_bndry_district_tiandi",
};

// 几何简化容差（度，约 50 米）：原始数据量大（区县级约 13.8MB），
// 简化后传输与前端渲染更轻量；仅降低顶点密度，不影响属性。
const SIMPLIFY_TOLERANCE = 0.0005;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") ?? "";
    const table = LEVEL_TABLES[level];

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid level, expected province|city|district",
        },
        { status: 400 }
      );
    }

    // 表名来自上方白名单常量，非用户输入，可安全拼接。
    const sql = `
      SELECT
        objectid AS id,
        name,
        gb,
        ST_AsGeoJSON(
          ST_SimplifyPreserveTopology(geom, ${SIMPLIFY_TOLERANCE})
        )::json AS geometry
      FROM ${table}
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
          gb: row.gb,
        },
      })),
    };

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      data: geojson,
    });
  } catch (error) {
    console.error("boundary-areas api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load boundary areas" },
      { status: 500 }
    );
  }
}
