import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import AccountShell from "../components/account/AccountShell";
import AuthForm from "../components/account/AuthForm";

export const metadata: Metadata = {
  title: "注册 · 忆城舆图 CircaMemo",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  return (
    <AccountShell
      eyebrow="Account · 注册"
      title="创建你的公众档案"
      description="只要一个邮箱就能开始记录。注册后你可以为任意一处西安文保点补充属于你的文字和照片，这些内容默认公开，可随时删除。"
    >
      <AuthForm mode="register" nextPath={nextPath} />
    </AccountShell>
  );
}
