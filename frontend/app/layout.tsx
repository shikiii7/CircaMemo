import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  applicationName: "忆城舆图 CircaMemo",
  title: "忆城舆图 CircaMemo · 中国历史文化遗产记忆地图",
  description:
    "忆城舆图 CircaMemo 原型版本 v1.0，展示中国历史文化遗产点、历史区域与历史地图叠加，并呈现公众讨论与城市记忆。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        style={{ "--header-h": "56px" } as React.CSSProperties}
      >
        {/* 顶部导航栏（流式，含搜索栏） */}
        <Navbar />
        {/* 主内容区域（地图页面） */}
        <main className="flex-1">{children}</main>
        {/* 页脚：信息说明区域 */}
        <Footer />
      </body>
    </html>
  );
}
