import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { MapSearchItem } from "@/lib/mapSearch";
import { convertMapSearchTemporalFields } from "./temporal";

type MapSearchRow = {
  kind: MapSearchItem["kind"];
  id: string;
  name: string;
  category: string | null;
  district: string | null;
  period: string | null;
  description: string | null;
  lng: number | string;
  lat: number | string;
  time_start: unknown;
  time_end: unknown;
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};

export async function GET(request?: Request) {
  const query = request
    ? new URL(request.url).searchParams.get("q")?.trim() ?? ""
    : "";
  if (!query) {
    return NextResponse.json(
      { success: true, count: 0, data: [] },
      { headers: CACHE_HEADERS },
    );
  }

  try {
    const sql = `
      WITH params AS (
        SELECT regexp_replace(lower(BTRIM($1)), '\\s+', '', 'g') AS query
      ),
      search_index AS (
        SELECT
          'heritage'::text AS kind,
          COALESCE(NULLIF(p.pid, ''), 'heritage:' || p.objectid::text) AS id,
          p.name,
          p.type AS category,
          p.district,
          p.period,
          p.intro AS description,
          ST_X(p.geom) AS lng,
          ST_Y(p.geom) AS lat,
          p.time_start,
          p.time_end
        FROM app.p2_heritagefull_xian p
        WHERE p.geom IS NOT NULL AND NULLIF(BTRIM(p.name), '') IS NOT NULL

        UNION ALL

        SELECT
          'area'::text AS kind,
          'area:' || a.objectid::text AS id,
          a.name,
          '历史区域'::text AS category,
          a.district,
          a.period,
          NULLIF(a.intro, '') AS description,
          ST_X(ST_PointOnSurface(a.geom)) AS lng,
          ST_Y(ST_PointOnSurface(a.geom)) AS lat,
          a.time_start,
          a.time_end
        FROM app.a4_histarea_xian a
        WHERE a.geom IS NOT NULL AND NULLIF(BTRIM(a.name), '') IS NOT NULL

        UNION ALL

        SELECT
          'national-heritage'::text AS kind,
          'national-heritage:' || n.objectid::text AS id,
          n.name_nh AS name,
          n.type_nh AS category,
          n.district,
          n.period_nh AS period,
          NULLIF(n.intro_nh, '') AS description,
          ST_X(n.geom) AS lng,
          ST_Y(n.geom) AS lat,
          n.time_start_nh AS time_start,
          n.time_end_nh AS time_end
        FROM app.p1_nh n
        WHERE n.geom IS NOT NULL AND NULLIF(BTRIM(n.name_nh), '') IS NOT NULL

        UNION ALL

        SELECT
          'ich'::text AS kind,
          'ich:' || i.objectid::text AS id,
          i.name_cn AS name,
          i.categorycn AS category,
          i.district,
          NULL::text AS period,
          NULL::text AS description,
          ST_X(i.geom) AS lng,
          ST_Y(i.geom) AS lat,
          NULL::bigint AS time_start,
          NULL::bigint AS time_end
        FROM app.p4_nmh i
        WHERE i.geom IS NOT NULL AND NULLIF(BTRIM(i.name_cn), '') IS NOT NULL

        UNION ALL

        SELECT
          'mingren'::text AS kind,
          'mingren:' || m.objectid::text AS id,
          m.pname AS name,
          '唐代名人故居'::text AS category,
          m.district,
          m.dynasty AS period,
          NULLIF(m.intro, '') AS description,
          ST_X(m.geom) AS lng,
          ST_Y(m.geom) AS lat,
          m.time_birth AS time_start,
          m.time_pass AS time_end
        FROM app.p3_fang108_mingrenguju m
        WHERE m.geom IS NOT NULL AND NULLIF(BTRIM(m.pname), '') IS NOT NULL

        UNION ALL

        SELECT
          'fang'::text AS kind,
          'fang:' || f.objectid::text AS id,
          f.name,
          '唐108坊'::text AS category,
          f.district,
          '唐'::text AS period,
          NULLIF(f.intro, '') AS description,
          ST_X(ST_PointOnSurface(f.geom)) AS lng,
          ST_Y(ST_PointOnSurface(f.geom)) AS lat,
          NULL::bigint AS time_start,
          NULL::bigint AS time_end
        FROM app.a5_tang108fang f
        WHERE f.geom IS NOT NULL AND NULLIF(BTRIM(f.name), '') IS NOT NULL
      ),
      scored AS (
        SELECT
          search_index.*,
          CASE
            WHEN regexp_replace(lower(search_index.name), '\\s+', '', 'g') = params.query THEN 0
            WHEN regexp_replace(lower(search_index.name), '\\s+', '', 'g') LIKE params.query || '%' THEN 1
            WHEN regexp_replace(lower(search_index.name), '\\s+', '', 'g') LIKE '%' || params.query || '%' THEN 2
            WHEN regexp_replace(lower(search_index.id), '\\s+', '', 'g') LIKE '%' || params.query || '%' THEN 3
            WHEN search_index.kind IN ('heritage', 'area')
              AND regexp_replace(lower(concat_ws(' ', search_index.category, search_index.district, search_index.period)), '\\s+', '', 'g')
                LIKE '%' || params.query || '%' THEN 4
            ELSE NULL
          END AS match_rank
        FROM search_index
        CROSS JOIN params
        WHERE params.query <> ''
      )
      SELECT kind, id, name, category, district, period, description, lng, lat, time_start, time_end
      FROM scored
      WHERE match_rank IS NOT NULL
      ORDER BY
        match_rank,
        CASE WHEN kind = 'heritage' THEN 0 ELSE 1 END,
        name,
        kind,
        id
      LIMIT 8;
    `;

    const result = await pool.query<MapSearchRow>(sql, [query]);
    const data: MapSearchItem[] = result.rows.map((row) => {
      const temporal = convertMapSearchTemporalFields(
        { time_start: row.time_start, time_end: row.time_end },
        row.id,
      );

      for (const issue of temporal.issues) {
        console.error(issue);
      }

      return {
        kind: row.kind,
        id: row.id,
        name: row.name,
        category: row.category,
        district: row.district,
        period: row.period,
        description: row.description,
        lng: Number(row.lng),
        lat: Number(row.lat),
        ...temporal.fields,
      };
    });

    return NextResponse.json(
      { success: true, count: data.length, data },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    console.error("map-search api error:", error);
    return NextResponse.json(
      { success: false, count: 0, data: [], error: "Failed to load map search index" },
      { status: 500 },
    );
  }
}
