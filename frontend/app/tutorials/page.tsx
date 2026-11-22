import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";
import styles from "../components/InfoPage.module.css";

export const metadata: Metadata = {
  title: "工具教程 · 忆城舆图 CircaMemo",
  description: "了解如何在 QGIS、ArcGIS、在线工具和 AI 中使用下载的 GeoJSON 图层数据。",
};

export default function TutorialsPage() {
  return (
    <InfoPage
      current="tutorials"
      eyebrow="Tools and tutorials"
      title="工具教程"
      description="下载的图层不需要特殊工具才能使用。你可以直接在 GIS 软件中打开，也可以先放进在线工具看看里面有什么。"
      meta="适用文件：本站下载的 GeoJSON（.geojson）图层"
    >
      <section>
        <h2>先认识一下下载的文件</h2>
        <p>
          本站数据使用 <strong>GeoJSON</strong> 格式，文件后缀为 <strong>.geojson</strong>。一个文件里既有地点或区域的位置，也有名称、类型、时代等属性。
        </p>
        <p>
          下载后不需要解压，也不要把后缀改成 .txt。数据坐标系为 <strong>WGS 84（EPSG:4326）</strong>，如果软件询问坐标系，选择这一项即可。
        </p>
      </section>

      <section>
        <h2>在 QGIS 中打开（推荐）</h2>
        <p>
          <a href="https://qgis.org" target="_blank" rel="noreferrer">QGIS</a> 是免费的桌面 GIS 软件，适合查看、编辑和分析这些文件。
        </p>
        <ul>
          <li>打开 QGIS，把下载的 .geojson 文件直接拖进窗口，或选择“图层 → 添加图层 → 添加矢量图层”。</li>
          <li>导入后就能在地图上看到点或面；右键图层并打开“属性表”，可以查看名称、类型等字段。</li>
          <li>在“图层属性”中可以修改颜色、符号和标签，也可以将图层另存为其他格式。</li>
        </ul>
      </section>

      <section>
        <h2>在 ArcGIS 中使用</h2>
        <p>
          在 ArcGIS Pro 中，可以先通过“添加数据”选择下载的文件；如果当前版本不能直接读取 GeoJSON，可使用“JSON 转要素”等转换工具后再加载。
        </p>
        <p>
          使用 ArcGIS Online 时，可在“内容 → 我的内容”中添加本地文件，并按提示创建托管要素图层，之后就能放入网络地图。
        </p>
      </section>

      <section>
        <h2>中文地图网站、应用与国产软件</h2>
        <ul>
          <li>
            <a href="https://www.supermap.com/zh-cn/" target="_blank" rel="noreferrer">超图 SuperMap iDesktop</a>：在“数据导入”中选择 GeoJSON 文件，导入后即可制作地图、查看属性和做空间分析；不同版本的菜单名称可能略有区别。
          </li>
          <li>
            <a href="https://lbs.amap.com/" target="_blank" rel="noreferrer">高德地图开放平台</a>和<a href="https://lbsyun.baidu.com/" target="_blank" rel="noreferrer">百度地图开放平台</a>：适合开发自己的网页或应用，可通过 JavaScript API 读取 GeoJSON 并添加点、线、面。它们不是普通地图 App 里的文件导入入口。
          </li>
          <li>
            <a href="https://www.ovital.com/" target="_blank" rel="noreferrer">奥维互动地图</a>：不同版本支持的格式有差异。如果当前版本不能直接导入 .geojson，可先用 QGIS 或 Mapshaper 转换为 KML/KMZ，再按当前版本的说明导入。
          </li>
          <li>
            <a href="https://www.2bulu.com/" target="_blank" rel="noreferrer">两步路</a>、<a href="https://www.foooooot.com/" target="_blank" rel="noreferrer">六只脚</a>：主要用于户外轨迹和路线。点或线数据可以先转换为它们支持的 GPX、KML 等格式再导入；面图层仍建议使用专业 GIS 软件。
          </li>
        </ul>
        <p>
          特别注意：本站文件使用 WGS 84 坐标。高德地图通常使用 GCJ-02，百度地图使用 BD-09；如果导入后位置发生偏移，应先做坐标转换，而不是手动逐个拖动地点。
        </p>
      </section>

      <section>
        <h2>不用安装软件：使用在线工具</h2>
        <ul>
          <li><a href="https://geojson.io" target="_blank" rel="noreferrer">geojson.io</a>：打开文件后即可在地图上查看，也适合简单编辑和检查属性。</li>
          <li><a href="https://mapshaper.org" target="_blank" rel="noreferrer">Mapshaper</a>：导入文件后可查看属性、简化边界，并导出为其他空间数据格式。</li>
        </ul>
        <p>
          在线工具会把文件上传到第三方服务。本站公开图层可以直接使用；如果以后处理自己的私密数据，请先确认对方的数据政策。
        </p>
      </section>

      <section>
        <h2>用于自己的地图或分析</h2>
        <p>
          开发者可以在 Leaflet、OpenLayers、Mapbox 等地图库中直接读取 GeoJSON，也可以用 Python、R 或数据库进行分析。字段含义请先查看数据仓库中的数据说明；在高德等国内地图服务中展示时，还需要注意坐标系转换。
        </p>
      </section>

      <section className={styles.aiTip}>
        <h2>还是不会？直接问 AI</h2>
        <p>
          如果还是不清楚，就直接拿着下载的文件随便问一个 AI，告诉它你想干什么就行了！！
        </p>
        <p>
          你可以直接说：“我下载了这个 GeoJSON 文件，想在 QGIS 里按类型设置不同颜色，请一步步教我。”把文件和报错截图一起发给它，通常会更容易得到准确的答案。
        </p>
      </section>
    </InfoPage>
  );
}
