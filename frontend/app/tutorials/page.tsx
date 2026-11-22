import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = {
  title: "工具教程 · 忆城舆图 CircaMemo",
  description: "忆城舆图 CircaMemo 工具教程页面。",
};

export default function TutorialsPage() {
  return (
    <InfoPage
      current="tutorials"
      eyebrow="Tools and tutorials"
      title="工具教程"
      description="本页内容正在整理中。"
      meta="当前状态：待完善"
    >
      <p>待完善</p>
    </InfoPage>
  );
}
