import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./InfoPage.module.css";

const infoLinks = [
  { key: "help", href: "/help", label: "帮助文档" },
  { key: "downloads", href: "/downloads", label: "数据下载" },
  { key: "tutorials", href: "/tutorials", label: "工具教程" },
  { key: "terms", href: "/terms", label: "用户协议" },
  { key: "privacy", href: "/privacy", label: "隐私政策" },
] as const;

type InfoPageProps = {
  current: (typeof infoLinks)[number]["key"];
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  children: ReactNode;
};

export default function InfoPage({
  current,
  eyebrow,
  title,
  description,
  meta,
  children,
}: InfoPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/" className={styles.backLink}>
            ← 返回地图
          </Link>
          <span className={styles.brandNote}>CIRCAMEMO · 忆城舆图</span>
        </div>

        <header className={styles.masthead}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
          <p className={styles.meta}>{meta}</p>
        </header>

        <nav className={styles.infoNav} aria-label="信息页面">
          {infoLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={styles.infoNavLink}
              aria-current={current === link.key ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <article className={styles.content}>{children}</article>

        <aside className={styles.contact} aria-label="联系我们">
          <strong>仍有疑问？</strong>
          <p>
            如果你发现内容错误、链接失效，或希望了解数据与隐私处理方式，请发送邮件至
            <a href="mailto:uki@n-dstudio.com">uki@n-dstudio.com</a>。
          </p>
        </aside>
      </div>
    </div>
  );
}
