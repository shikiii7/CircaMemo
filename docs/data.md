# 公开图层数据说明

公开数据来自当前网站使用的 `app` 数据表，以字段白名单导出。几何与要素数量保持不变，仅移除地图运行不需要的过程字段、重复字段和原始备注字段。

所有文件均为 GeoJSON `FeatureCollection`，坐标系为 WGS 84（EPSG:4326）。`geometry` 保存空间几何，其余字段位于每个 Feature 的 `properties` 中。

## 点图层

| 文件 | 要素数 | 属性字段 |
|---|---:|---|
| `point/P1_NH_bn.geojson` | 5,198 | `objectid`, `name_nh`, `period_nh`, `type_nh`, `batch_nh`, `intro_nh`, `province_nh`, `city`, `district`, `time_start_nh`, `time_end_nh` |
| `point/P2_heritagefull_xian_bn.geojson` | 485 | `objectid`, `pid`, `name`, `level`, `type`, `period`, `batch`, `district`, `cover_image_key`, `cover_source`, `intro`, `ref`, `open`, `platform`, `address`, `time_start`, `time_end` |
| `point/P3_fang108_mingrenguju_bn.geojson` | 40 | `objectid`, `pname`, `dynasty`, `time_birth`, `time_pass`, `intro`, `fname`, `fangid`, `pid`, `district` |
| `point/P4_NMH_bn.geojson` | 3,630 | `objectid`, `name_cn`, `categorycn`, `cover_image_key`, `province`, `city`, `district` |

## 面图层

| 文件 | 要素数 | 属性字段 |
|---|---:|---|
| `area/A1_Bndry_province_tiandi.geojson` | 34 | `objectid`, `name`, `gb` |
| `area/A2_Bndry_city_tiandi.geojson` | 375 | `objectid`, `name`, `gb` |
| `area/A3_Bndry_district_tiandi.geojson` | 2,891 | `objectid`, `name`, `gb` |
| `area/A4_HistArea_xian_bn.geojson` | 16 | `objectid`, `name`, `period`, `intro`, `shape_length`, `shape_area`, `district`, `time_start`, `time_end` |
| `area/A5_tang108fang_bn.geojson` | 120 | `objectid`, `name`, `intro`, `fid`, `count_pid`, `district` |

## 字段约定

- `objectid`：图层内记录标识。
- `pid`：遗产点或人物关联标识。
- `time_start` / `time_end`：时间轴使用的起止年份；未知或开放结束可为空。
- `cover_image_key`：封面图相对路径，配合网站的图片服务地址使用。
- `gb`：行政区划国标码。
- 空值保持为 GeoJSON `null`，不自行补造缺失内容。

## 下载与导入

在 GitHub 文件页面选择 **Download raw file** 可下载单个文件。GeoJSON 可导入 QGIS、ArcGIS 等常见 GIS 软件。

如需运行完整网站，请按根目录 README 初始化 PostgreSQL/PostGIS，并执行 `scripts/import_geojson.py`。脚本会将文件导入到对应的 `app` 图层表。
