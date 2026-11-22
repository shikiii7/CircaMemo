import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./AccountShell.module.css";

export type AccountTab = {
  href: string;
  label: string;
  active?: boolean;
};

type AccountShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  tabs?: AccountTab[];
  children: ReactNode;
};

export default function AccountShell({
  eyebrow,
  title,
  description,
  tabs,
  children,
}: AccountShellProps) {
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
        </header>

        {tabs && tabs.length > 0 && (
          <nav className={styles.tabs} aria-label="账号导航">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.tab} ${tab.active ? styles.tabActive : ""}`}
                aria-current={tab.active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}

        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
