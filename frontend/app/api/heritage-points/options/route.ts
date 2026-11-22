import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type OptionRow = {
  pid: string | null;
  name: string | null;
  district: string | null;
  category: string | null;
  level: string | null;
  lng: number | null;
  lat: number | null;
};

/** 西安文保点（app.p2_heritagefull_xian）下拉选项，供用户录入时选择文保点。 */
export async function GET() {
  try {
    const result = await pool.query<OptionRow>(
      `SELECT p.pid,
              p.name,
              p.district,
              p.type AS category,
              p.level,
              ST_X(p.geom) AS lng,
              ST_Y(p.geom) AS lat
         FROM app.p2_heritagefull_xian p
        WHERE p.pid IS NOT NULL AND p.name IS NOT NULL
        ORDER BY p.pid`,
    );

    const data = result.rows.map((row) => ({
      pid: row.pid as string,
      name: row.name as string,
      district: row.district,
      category: row.category,
      level: row.level,
      lng: row.lng === null ? null : Number(row.lng),
      lat: row.lat === null ? null : Number(row.lat),
    }));

    return NextResponse.json(
      { success: true, count: data.length, data },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch (error) {
    console.error("heritage-point options api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load heritage point options" },
      { status: 500 },
    );
  }
}
