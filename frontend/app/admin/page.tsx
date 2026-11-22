import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAdminOverview } from "@/lib/adminOverview";
import AccountShell, { type AccountTab } from "../components/account/AccountShell";
import AdminDashboard from "../components/account/AdminDashboard";
import styles from "../components/account/account.module.css";

export const metadata: Metadata = {
  title: "后台管理 · 忆城舆图 CircaMemo",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const tabs: AccountTab[] = [
    { href: "/account", label: "我的记录" },
    { href: "/admin", label: "后台管理", active: true },
  ];

  if (user.role !== "admin") {
    return (
      <AccountShell
        eyebrow="Admin · 后台管理"
        title="需要管理员权限"
        description="当前账号不是管理员。管理员可以在本页管理注册用户与其录入内容。"
        tabs={tabs}
      >
        <section className={styles.card}>
          <p className={styles.empty}>
            如需管理权限，请联系站点维护者在数据库中授予：把 app.user_account.role 更新为
            &quot;admin&quot;。
          </p>
        </section>
      </AccountShell>
    );
  }

  const overview = await loadAdminOverview();

  return (
    <AccountShell
      eyebrow="Admin · 后台管理"
      title="用户信息后台管理"
      description="查看注册用户、启用或停用账号、调整管理员权限，并审核或删除用户录入的文保点内容。"
      tabs={tabs}
    >
      <AdminDashboard initialOverview={overview} currentUserId={user.id} />
    </AccountShell>
  );
}
