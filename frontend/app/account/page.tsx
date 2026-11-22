import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserContents } from "@/lib/userContent";
import AccountShell, { type AccountTab } from "../components/account/AccountShell";
import SubmissionPanel from "../components/account/SubmissionPanel";
import LogoutButton from "../components/account/LogoutButton";
import styles from "../components/account/account.module.css";

export const metadata: Metadata = {
  title: "我的记录 · 忆城舆图 CircaMemo",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const items = await listUserContents(user.id);
  const tabs: AccountTab[] = [
    { href: "/account", label: "我的记录", active: true },
    ...(user.role === "admin"
      ? [{ href: "/admin", label: "后台管理" } satisfies AccountTab]
      : []),
  ];

  return (
    <AccountShell
      eyebrow="Account · 我的记录"
      title="我的文保点记录"
      description="选择一个西安文保点，录入你的文字与图片。记录保存后可在下方查看与删除，管理员也可以在后管理系统中处理。"
      tabs={tabs}
    >
      <div className={styles.accountBar}>
        <div>
          <span className={styles.label}>当前登录：</span>
          <strong>{user.displayName}</strong>
          <span className={styles.hint}>{user.email}</span>
          {user.role === "admin" && <span className={styles.rolePill}>管理员</span>}
        </div>
        <LogoutButton />
      </div>

      <SubmissionPanel initialItems={items} />
    </AccountShell>
  );
}
