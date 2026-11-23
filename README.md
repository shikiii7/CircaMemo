# [在线访问忆城舆图 CircaMemo](https://chronocityatlas.com/)

# 忆城舆图 CircaMemo

**中文**：忆城舆图（CircaMemo）是面向城市历史文化遗产展示、历史空间认知与公共记忆表达的交互式地图。项目包含完整网站源码、九个公开矢量图层，以及数据库初始化脚本。

**English**: CircaMemo is an interactive map for presenting urban historical and cultural heritage, exploring historical spaces, and expressing public memory. This repository contains the complete website source code, nine public vector layers, and database initialization scripts.

![忆城舆图项目首页 / CircaMemo home page](docs/images/circamemo-home.png)

## 功能 | Features

- 高德地图底图、样式切换、地图搜索与图层控制 / AMap base maps, style switching, map search, and layer controls
- 西安文保、全国文保、国家级非遗、唐代名人故居等点图层 / Point layers for Xi'an heritage, national heritage, national ICH, Tang-era notable residences, and more
- 行政边界、西安历史区域、唐长安 108 坊等面图层 / Polygon layers for administrative boundaries, Xi'an historic areas, and the 108 wards of Tang Chang'an
- 历史时间轴与 GeoServer 历史地图叠加 / Historical timeline and GeoServer historical map overlays
- 公众印象词云、讨论内容与城市记忆相册 / Public impression word clouds, discussions, and urban memory albums
- 用户注册登录、文保点记录录入与管理后台 / User registration and login, heritage record submission, and an administration dashboard

## 技术栈 | Technology Stack

- Next.js 16、React 19、TypeScript
- 高德地图 JS API 2.0 / AMap JS API 2.0
- PostgreSQL 与 PostGIS / PostgreSQL and PostGIS
- GeoServer WMS（历史地图）/ GeoServer WMS for historical maps

## 目录 | Repository Structure

```text
CircaMemo/
├── frontend/          # Next.js 网站与运行必需静态资源 / Next.js website and required static assets
├── data/              # 九个精简 GeoJSON 图层 / Nine minimal GeoJSON layers
├── scripts/           # 数据导入脚本 / Data import scripts
├── sql/               # 数据库初始化脚本 / Database initialization scripts
└── docs/              # 数据说明与项目截图 / Data documentation and project screenshots
```

## 本地运行 | Local Development

### 1. 准备环境 | Prerequisites

- Node.js 20 或更高版本 / Node.js 20 or later
- PostgreSQL 与 PostGIS / PostgreSQL and PostGIS
- Python 3，用于首次导入数据 / Python 3 for the initial data import
- 高德地图 Web JS API Key 与 Security Code / An AMap Web JS API key and security code

### 2. 安装依赖 | Install Dependencies

```bash
npm install --prefix frontend
```

### 3. 初始化数据库 | Initialize the Database

**中文**：创建你自己的数据库，然后执行以下命令，并将 `YOUR_DATABASE_NAME` 替换为实际数据库名：

**English**: Create your own database, then run the following command after replacing `YOUR_DATABASE_NAME` with its actual name:

```bash
psql -d YOUR_DATABASE_NAME -f sql/00_init.sql
```

**中文**：`00_init.sql` 会启用 PostGIS 并创建 `app` schema，需要具有相应权限的数据库账号。

**English**: `00_init.sql` enables PostGIS and creates the `app` schema; the database account must have the required privileges.

### 4. 配置环境变量 | Configure Environment Variables

参考 `frontend/.env.example`，在 `frontend/` 下创建 `.env.local`：

Copy the settings from `frontend/.env.example` into a new `frontend/.env.local` file:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=your_database_port
POSTGRES_DB=your_database_name
POSTGRES_USER=your_database_user
POSTGRES_PASSWORD=your_database_password

NEXT_PUBLIC_AMAP_KEY=your_amap_key
NEXT_PUBLIC_AMAP_SECURITY_CODE=your_amap_security_code
NEXT_PUBLIC_IMG_BASE_URL=your_image_service_base_url
GEOSERVER_WMS_URL=your_geoserver_wms_url
```

`.env.local` 包含私有配置，不应提交到 Git。 / `.env.local` contains private configuration and must not be committed to Git.

### 5. 导入地图数据和用户表 | Import Map Data and Create User Tables

```bash
python -m pip install psycopg2-binary
python scripts/import_geojson.py
psql -d YOUR_DATABASE_NAME -f sql/01_user_accounts.sql
```

**中文**：导入脚本面向空数据库；已经存在的图层表会跳过，不会被覆盖。九张图层表与字段说明见 [docs/data.md](docs/data.md)。

**English**: The import script is intended for an empty database. Existing layer tables are skipped and are not overwritten. See [docs/data.md](docs/data.md) for the nine layer tables and their fields.

### 6. 启动网站 | Start the Website

```bash
npm run dev
```

启动后访问终端实际输出的本地地址，端口以启动日志为准。 / After startup, open the local address printed in the terminal; use the port shown in the startup log.

生产构建与启动 / Production build and startup:

```bash
npm run build
npm run start
```

## 数据下载 | Data Downloads

**中文**：公开数据位于 [data/](data/)，也可直接在 GitHub 浏览：

**English**: Public data is available in [data/](data/) and can also be browsed directly on GitHub:

https://github.com/shikiii7/CircaMemo/tree/main/data

**中文**：数据仅保留当前网站 API、地图绘制、搜索、筛选与交互所需字段。所有 GeoJSON 使用 WGS 84（EPSG:4326）坐标。字段清单见 [docs/data.md](docs/data.md)。

**English**: The data retains only the fields required by the current website APIs, map rendering, search, filtering, and interactions. All GeoJSON files use WGS 84 (EPSG:4326) coordinates. See [docs/data.md](docs/data.md) for the field list.

## 外部服务 | External Services

- **地图底图 / Base maps**：需要部署者自己的高德地图 Key 与 Security Code。 / Deployers must provide their own AMap key and security code.
- **封面图片 / Cover images**：遗产与非遗封面由部署者自行准备，并通过 `NEXT_PUBLIC_IMG_BASE_URL` 配置图片服务基础地址；公开数据中的 `cover_image_key` 是相对于该地址的资源路径。 / Deployers provide their own heritage and ICH covers and configure the image service with `NEXT_PUBLIC_IMG_BASE_URL`; each public `cover_image_key` is a resource path relative to that base URL.
- **历史地图 / Historical maps**：需要部署者自己的 GeoServer WMS，并通过 `GEOSERVER_WMS_URL` 配置接口。`frontend/public/data/map-metadata.json` 使用本站 `/api/geoserver-wms` 代理，图层名需与部署者的服务一致；未配置接口时历史地图不可用，其他地图功能不受影响。 / Deployers must provide a GeoServer WMS endpoint through `GEOSERVER_WMS_URL`. The metadata in `frontend/public/data/map-metadata.json` uses the site's `/api/geoserver-wms` proxy, and layer names must match the deployer's service. Without an endpoint, historical maps are unavailable while other map features continue to work.
- **用户上传 / User uploads**：图片默认保存在 `data/uploads/user-content/`，可通过 `USER_UPLOAD_DIR` 修改。备份用户数据时应同时备份数据库和该目录。 / Images are stored in `data/uploads/user-content/` by default, configurable with `USER_UPLOAD_DIR`. Back up both the database and this directory when preserving user data.
- **城市记忆相册 / Urban memory albums**：JSON 内容与 20 张派生 WebP 图片均包含在仓库中，无需另行恢复即可使用。 / The JSON content and all 20 derived WebP images are included in the repository and work without additional asset restoration.

## 许可证 | License

**中文**：网站源码采用 [MIT License](LICENSE)。第三方地图、图片及数据的原始来源和适用条款仍归各权利方所有；使用或再分发相关数据时，请同时遵守其原始条款。

**English**: The website source code is available under the [MIT License](LICENSE). Third-party maps, images, and data remain subject to their original sources, owners, and applicable terms; comply with those terms when using or redistributing them.
