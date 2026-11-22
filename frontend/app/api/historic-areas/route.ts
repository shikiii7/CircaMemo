import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { convertHistoricAreaTemporalFields } from "./temporal";

export async function GET() {
  try {
    const sql = `
      SELECT
        objectid AS id,
        objectid,
        name AS area_name,
        period,
        intro,
        shape_length,
        shape_area,
        district AS district_name,
        time_start,
        time_end,
        ST_AsGeoJSON(geom)::json AS geometry
      FROM app.a4_histarea_xian
      ORDER BY objectid;
    `;

    const result = await pool.query(sql);

    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map((row) => {
        const temporal = convertHistoricAreaTemporalFields(
          { time_start: row.time_start, time_end: row.time_end },
          row.objectid ?? row.id,
        );

        for (const issue of temporal.issues) {
          console.error(issue);
        }

        return {
          type: "Feature",
          geometry: row.geometry,
          properties: {
            id: row.id,
            objectid: row.objectid,
            area_name: row.area_name,
            period: row.period,
            intro: row.intro,
            shape_length: row.shape_length,
            shape_area: row.shape_area,
            district_name: row.district_name,
            ...temporal.fields,
          },
        };
      }),
    };

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      data: geojson,
    });
  } catch (error) {
    console.error("historic-areas api error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load historic areas" },
      { status: 500 }
    );
  }
}