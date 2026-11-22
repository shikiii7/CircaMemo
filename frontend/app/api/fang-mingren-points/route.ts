import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { convertMingrenTemporalFields } from "./temporal";

// 唐代名人故居（app.p3_fang108_mingrenguju，40 个点要素）
export async function GET() {
  try {
    const sql = `
      SELECT
          p.objectid   AS id,
          p.pname      AS name,
          p.dynasty,
          p.time_birth,
          p.time_pass,
          p.intro,
          p.fname      AS fang_name,
          p.fangid     AS fang_id,
          p.pid,
          p.district,
          ST_X(p.geom) AS lng,
          ST_Y(p.geom) AS lat
      FROM app.p3_fang108_mingrenguju p
      WHERE p.geom IS NOT NULL
      ORDER BY p.objectid;
    `;

    const result = await pool.query(sql);

    const data = result.rows.map((row) => {
      const temporal = convertMingrenTemporalFields(
        { time_birth: row.time_birth, time_pass: row.time_pass },
        row.id,
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
    console.error("fang-mingren-points api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load Fang mingren points" },
      { status: 500 }
    );
  }
}
