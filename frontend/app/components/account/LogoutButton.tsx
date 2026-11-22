"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./account.module.css";

export default function LogoutButton({
  className,
  label = "退出登录",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={className ?? `${styles.button} ${styles.buttonGhost} ${styles.buttonSmall}`}
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? "退出中…" : label}
    </button>
  );
}
