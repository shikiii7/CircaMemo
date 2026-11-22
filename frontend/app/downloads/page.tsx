import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

const DATA_REPOSITORY_URL = "https://github.com/shikiii7/CircaMemo/tree/main/data";

export const metadata: Metadata = {
  title: "数据下载 · 忆城舆图 CircaMemo",
  description: "下载忆城舆图 CircaMemo 地图使用的公开 GeoJSON 图层数据。",
};

export default function DownloadsPage() {
  return (
    <InfoPage
      current="downloads"
      eyebrow="Data downloads"
      title="数据下载"
      description="这里提供地图当前使用的九个矢量图层。公开数据仅保留地图展示、搜索、筛选和交互所需字段，便于直接下载与使用。"
      meta="数据格式：GeoJSON · 坐标系：WGS 84（EPSG:4326）"
    >
      <section>
        <h2>公开数据仓库</h2>
        <p>数据与完整开源源码一同维护在 GitHub，可进入以下目录浏览或下载：</p>
        <p>
          <a href={DATA_REPOSITORY_URL} target="_blank" rel="noreferrer">
            {DATA_REPOSITORY_URL}
          </a>
        </p>
      </section>
      <section>
        <h2>图层内容</h2>
        <ul>
          <li><strong>点图层：</strong>全国重点文保单位、西安市文保点、唐代名人故居、国家级非遗项目。</li>
          <li><strong>面图层：</strong>省级边界、市级边界、区县级边界、西安历史区域、唐长安 108 坊。</li>
        </ul>
      </section>
      <section>
        <h2>下载与使用</h2>
        <p>
          在数据目录中打开所需文件，再选择“Download raw file”即可下载。各文件均为标准 GeoJSON，可导入常见 GIS 软件；字段含义见仓库中的数据说明。
        </p>
      </section>
    </InfoPage>
  );
}
