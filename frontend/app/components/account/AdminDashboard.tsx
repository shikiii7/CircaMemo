"use client";

import { useState } from "react";
import type { AdminOverview, AdminUserRow } from "@/lib/adminOverview";
import type { AdminContentItem } from "@/lib/userContent";
import { formatDateTime } from "@/lib/formatDateTime";
import styles from "./account.module.css";

type Props = {
  initialOverview: AdminOverview;
  currentUserId: number;
};

export default function AdminDashboard({ initialOverview, currentUserId }: Props) {
  const [overview, setOverview] = useState<AdminOverview>(initialOverview);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/overview", { cache: "no-store" });
    const json = (await response.json()) as {
      success?: boolean;
      stats?: AdminOverview["stats"];
      users?: AdminUserRow[];
      contents?: AdminContentItem[];
    };
    if (response.ok && json.success && json.stats && json.users && json.contents) {
      setOverview({
        stats: json.stats,
        users: json.users,
        contents: json.contents,
      });
    }
  }

  async function updateUser(
    user: AdminUserRow,
    payload: { status?: "active" | "disabled"; role?: "user" | "admin" },
    key: string,
  ) {
    if (busyKey) return;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !json.success) {
        setError(json.error ?? "操作失败");
        return;
      }
      setNotice(
        payload.status
          ? `已${payload.status === "disabled" ? "停用" : "启用"}「${user.displayName}」`
          : `已调整「${user.displayName}」的角色`,
      );
      await refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusyKey(null);
    }
  }

  async function updateContent(
    content: AdminContentItem,
    status: "published" | "hidden",
  ) {
    if (busyKey) return;
    setBusyKey(`content:${content.id}`);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/contents/${content.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !json.success) {
        setError(json.error ?? "操作失败");
        return;
      }
      setNotice(status === "hidden" ? "记录已隐藏" : "记录已恢复公开");
      await refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteContent(content: AdminContentItem) {
    if (busyKey) return;
    if (!window.confirm(`确定删除「${content.heritageName}」下由 ${content.ownerName} 提交的记录吗？`)) {
      return;
    }
    setBusyKey(`content:${content.id}`);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/contents/${content.id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !json.success) {
        setError(json.error ?? "删除失败");
        return;
      }
      setNotice("记录已删除");
      await refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className={styles.section}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>数据概览</h2>
          <span className={styles.cardHint}>实时读取 app.user_* 数据表</span>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>用户总数</div>
            <div className={styles.statValue}>{overview.stats.userCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>正常账号</div>
            <div className={styles.statValue}>{overview.stats.activeUserCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>管理员</div>
            <div className={styles.statValue}>{overview.stats.adminCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>录入记录</div>
            <div className={styles.statValue}>{overview.stats.contentCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>已隐藏</div>
            <div className={styles.statValue}>{overview.stats.hiddenContentCount}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>图片</div>
            <div className={styles.statValue}>{overview.stats.imageCount}</div>
          </div>
        </div>
        {error && (
          <p className={styles.alert} role="alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        )}
        {notice && (
          <p className={styles.notice} role="status" style={{ marginTop: 16 }}>
            {notice}
          </p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>用户管理</h2>
          <span className={styles.cardHint}>停用后立即失效其全部登录会话</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>昵称</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>记录数</th>
                <th>注册时间</th>
                <th>最近登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {overview.users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id}>
                    <td>
                      {user.displayName}
                      {isSelf && <span className={styles.tag}>本人</span>}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {user.role === "admin" ? (
                        <span className={styles.rolePill}>管理员</span>
                      ) : (
                        "普通用户"
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          user.status === "active" ? styles.statusActive : styles.statusDisabled
                        }`}
                      >
                        {user.status === "active" ? "正常" : "已停用"}
                      </span>
                    </td>
                    <td>{user.contentCount}</td>
                    <td>{user.createdAt ? formatDateTime(user.createdAt) : "—"}</td>
                    <td>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSmall}`}
                          onClick={() =>
                            updateUser(
                              user,
                              { status: user.status === "active" ? "disabled" : "active" },
                              `user:${user.id}:status`,
                            )
                          }
                          disabled={busyKey !== null || (isSelf && user.status === "active")}
                        >
                          {user.status === "active" ? "停用" : "启用"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSmall}`}
                          onClick={() =>
                            updateUser(
                              user,
                              { role: user.role === "admin" ? "user" : "admin" },
                              `user:${user.id}:role`,
                            )
                          }
                          disabled={busyKey !== null || (isSelf && user.role === "admin")}
                        >
                          {user.role === "admin" ? "取消管理员" : "设为管理员"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>录入内容管理</h2>
          <span className={styles.cardHint}>共 {overview.contents.length} 条</span>
        </div>
        {overview.contents.length === 0 ? (
          <p className={styles.empty}>还没有用户录入内容。</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>文保点</th>
                  <th>标题 / 内容</th>
                  <th>作者</th>
                  <th>状态</th>
                  <th>图片</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {overview.contents.map((content) => (
                  <tr key={content.id}>
                    <td>
                      {content.heritageName}
                      <div className={styles.hint}>{content.heritagePid}</div>
                    </td>
                    <td className={styles.tableCellWrap} title={content.body}>
                      {content.title ? `${content.title} · ` : ""}
                      {content.body}
                    </td>
                    <td>
                      {content.ownerName}
                      <div className={styles.hint}>{content.ownerEmail}</div>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          content.status === "published"
                            ? styles.statusActive
                            : styles.statusDisabled
                        }`}
                      >
                        {content.status === "published" ? "公开" : "已隐藏"}
                      </span>
                    </td>
                    <td>{content.images.length}</td>
                    <td>{formatDateTime(content.createdAt)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSmall}`}
                          onClick={() =>
                            updateContent(
                              content,
                              content.status === "published" ? "hidden" : "published",
                            )
                          }
                          disabled={busyKey !== null}
                        >
                          {content.status === "published" ? "隐藏" : "恢复"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSmall}`}
                          onClick={() => deleteContent(content)}
                          disabled={busyKey !== null}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
