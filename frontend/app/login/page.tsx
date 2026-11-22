import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import AccountShell from "../components/account/AccountShell";
import AuthForm from "../components/account/AuthForm";

export const metadata: Metadata = {
  title: "登录 · 忆城舆图 CircaMemo",
};

function resolveNextPath(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/account";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  const params = await searchParams;

  return (
    <AccountShell
      eyebrow="Account · 登录"
      title="登录忆城舆图"
      description="登录后可以选择一处西安文保点，写下你自己的文字与照片记录，所有内容归入你的个人档案。"
    >
      <AuthForm mode="login" nextPath={resolveNextPath(params.next)} />
    </AccountShell>
  );
}
