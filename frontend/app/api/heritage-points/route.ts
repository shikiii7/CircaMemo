import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { convertHeritagePointTemporalFields } from "./temporal";

export async function GET() {
  try {
    const sql = `
      SELECT
          p.objectid   AS id,
          p.pid,
          p.name       AS point_name,
          p.level      AS protection_level,
          p.type       AS heritage_type,
          p.period     AS era,
          p.batch,
          p.district,
          p.cover_image_key,
          p.cover_source AS image_source,
          p.intro,
          p.ref        AS reference,
          p.open       AS open_status,
          p.platform   AS official_platform,
          p.address,
          NULL         AS area_name,
          ST_X(p.geom) AS lng,
          ST_Y(p.geom) AS lat,
          p.time_start,
          p.time_end
      FROM app.p2_heritagefull_xian p
      ORDER BY p.pid;
    `;

    const result = await pool.query(sql);
    const data = result.rows.map((row) => {
      const temporal = convertHeritagePointTemporalFields(
        { time_start: row.time_start, time_end: row.time_end },
        row.pid ?? row.id,
      );

      for (const issue of temporal.issues) {
        console.error(issue);
      }

      return { ...row, ...temporal.fields };
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("heritage-points api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load heritage points" },
      { status: 500 }
    );
  }
}
