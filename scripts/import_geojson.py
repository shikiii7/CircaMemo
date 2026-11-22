#!/usr/bin/env python3
"""Import the public GeoJSON files into empty app tables."""
import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data"
LAYERS = [
    ("area/A1_Bndry_province_tiandi.geojson", "a1_bndry_province_tiandi"),
    ("area/A2_Bndry_city_tiandi.geojson", "a2_bndry_city_tiandi"),
    ("area/A3_Bndry_district_tiandi.geojson", "a3_bndry_district_tiandi"),
    ("area/A4_HistArea_xian_bn.geojson", "a4_histarea_xian"),
    ("area/A5_tang108fang_bn.geojson", "a5_tang108fang"),
    ("point/P1_NH_bn.geojson", "p1_nh"),
    ("point/P2_heritagefull_xian_bn.geojson", "p2_heritagefull_xian"),
    ("point/P3_fang108_mingrenguju_bn.geojson", "p3_fang108_mingrenguju"),
    ("point/P4_NMH_bn.geojson", "p4_nmh"),
]


def load_env(path):
    env = {}
    if path.exists():
        with path.open(encoding="utf-8") as file:
            for line in file:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def infer_sql_type(values):
    has_int = False
    has_float = False
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) or isinstance(value, bool):
            return "TEXT"
        if isinstance(value, float):
            has_float = True
        elif isinstance(value, int):
            has_int = True
    if has_float:
        return "DOUBLE PRECISION"
    if has_int:
        return "BIGINT"
    return "TEXT"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", type=Path, default=ROOT / "frontend" / ".env.local")
    parser.add_argument("--database", help="Override POSTGRES_DB from the env file")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    datasets = []
    for relative_path, table in LAYERS:
        path = DATA_ROOT / relative_path
        with path.open(encoding="utf-8-sig") as file:
            data = json.load(file)
        features = data.get("features", [])
        fields = sorted(
            {key for feature in features for key in feature.get("properties", {})}
        )
        datasets.append((relative_path, table, features, fields))

    if args.dry_run:
        for relative_path, table, features, fields in datasets:
            print(f"{relative_path} -> app.{table}: {len(features)} features, {len(fields)} fields")
        return

    env = load_env(args.env)
    required = ["POSTGRES_PORT", "POSTGRES_USER", "POSTGRES_PASSWORD"]
    if not args.database:
        required.append("POSTGRES_DB")
    missing = [key for key in required if not env.get(key)]
    if missing:
        parser.error(f"Missing {', '.join(missing)} in {args.env}")

    connection = psycopg2.connect(
        host=env.get("POSTGRES_HOST", "localhost"),
        port=int(env["POSTGRES_PORT"]),
        dbname=args.database or env["POSTGRES_DB"],
        user=env["POSTGRES_USER"],
        password=env["POSTGRES_PASSWORD"],
    )

    try:
        with connection.cursor() as cursor:
            for relative_path, table, features, fields in datasets:
                cursor.execute("SELECT to_regclass(%s)", (f"app.{table}",))
                if cursor.fetchone()[0]:
                    print(f"SKIP app.{table}: table already exists")
                    continue

                columns = []
                for field in fields:
                    values = [feature.get("properties", {}).get(field) for feature in features]
                    columns.append(f'"{field}" {infer_sql_type(values)}')
                columns.append("geom geometry(Geometry,4326)")
                cursor.execute(
                    f'CREATE TABLE app."{table}" (' + ", ".join(columns) + ")"
                )

                column_sql = ", ".join(f'"{field}"' for field in fields)
                placeholders = ", ".join(["%s"] * len(fields))
                insert_sql = (
                    f'INSERT INTO app."{table}" ({column_sql}, geom) '
                    f"VALUES ({placeholders}, ST_Force2D(ST_GeomFromGeoJSON(%s)))"
                )
                for feature in features:
                    properties = feature.get("properties", {})
                    values = [properties.get(field) for field in fields]
                    geometry = feature.get("geometry")
                    cursor.execute(
                        insert_sql,
                        values + [json.dumps(geometry) if geometry is not None else None],
                    )
                connection.commit()
                print(f"OK app.{table}: {len(features)} features")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
