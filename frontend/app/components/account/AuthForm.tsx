"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./account.module.css";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
  nextPath: string;
};

export default function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setErrors({});

    try {
      const response = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            isRegister ? { email, displayName, password } : { email, password },
          ),
        },
      );
      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        errors?: Record<string, string>;
      };

      if (!response.ok || !json.success) {
        setErrors(json.errors ?? {});
        setError(json.error ?? "操作失败，请稍后重试");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={`${styles.card} ${styles.narrowCard}`}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{isRegister ? "创建账号" : "账号登录"}</h2>
        <span className={styles.cardHint}>忆城舆图 · 公众档案</span>
      </div>

      <form className={styles.fieldGrid} onSubmit={handleSubmit} noValidate>
        {isRegister && (
          <label className={styles.field}>
            <span className={styles.label}>昵称</span>
            <input
              className={styles.input}
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="展示在你录入内容旁的称呼"
              autoComplete="nickname"
              maxLength={32}
              required
            />
            {errors.displayName && <span className={styles.fieldError}>{errors.displayName}</span>}
          </label>
        )}

        <label className={styles.field}>
          <span className={styles.label}>邮箱</span>
          <input
            className={styles.input}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>密码</span>
          <input
            className={styles.input}
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? "至少 8 位" : "请输入密码"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
          {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
        </label>

        {error && (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "正在处理…" : isRegister ? "注册并登录" : "登录"}
          </button>
        </div>
      </form>

      <p className={styles.formFooter}>
        {isRegister ? "已有账号？" : "还没有账号？"}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "去登录" : "立即注册"}
        </Link>
      </p>
      {isRegister && (
        <p className={styles.hint}>
          注册即表示同意《用户协议》与《隐私政策》。你的邮箱仅用于登录，不会公开展示。
        </p>
      )}
    </section>
  );
}
