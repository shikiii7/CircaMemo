"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/auth/validation";
import styles from "./Navbar.module.css";

/** 右上角的注册 / 登录入口；已登录时展示账号菜单。 */
export default function AuthNav() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((json: { success?: boolean; user?: AuthUser | null }) => {
        if (!cancelled) setUser(json?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (user === undefined) {
    return <span className={styles.authPlaceholder} aria-hidden="true" />;
  }

  if (user === null) {
    return (
      <Link href="/login" className={styles.authLink}>
        注册 / 登录
      </Link>
    );
  }

  return (
    <div className={styles.authMenu} ref={containerRef}>
      <button
        type="button"
        className={styles.authButton}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.displayName}
        <span className={styles.authCaret} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.authDropdown} role="menu">
          <Link
            href="/account"
            className={styles.authItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            我的记录
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className={styles.authItem}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              后台管理
            </Link>
          )}
          <button
            type="button"
            className={styles.authItem}
            role="menuitem"
            onClick={handleLogout}
            disabled={pending}
          >
            {pending ? "退出中…" : "退出登录"}
          </button>
        </div>
      )}
    </div>
  );
}
