"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { UserContentItem } from "@/lib/userContent";
import type { HeritageOption } from "@/lib/heritageOption";
import { formatDateTime } from "@/lib/formatDateTime";
import HeritageMapPicker from "./HeritageMapPicker";
import styles from "./account.module.css";

type PickedImage = { file: File; url: string };

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const BODY_MAX = 2000;
const TITLE_MAX = 80;

export default function SubmissionPanel({
  initialItems,
}: {
  initialItems: UserContentItem[];
}) {
  const [items, setItems] = useState<UserContentItem[]>(initialItems);
  const [options, setOptions] = useState<HeritageOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selected, setSelected] = useState<HeritageOption | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const response = await fetch("/api/heritage-points/options");
        const json = (await response.json()) as {
          success?: boolean;
          data?: HeritageOption[];
          error?: string;
        };
        if (!response.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error(json.error ?? "load failed");
        }
        if (!cancelled) setOptions(json.data);
      } catch {
        if (!cancelled) setOptionsError("文保点列表加载失败，请刷新页面重试");
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return options.slice(0, 12);
    return options
      .filter((option) => {
        const haystack = `${option.name} ${option.pid} ${option.district ?? ""} ${
          option.category ?? ""
        }`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 15);
  }, [options, keyword]);

  function pickOption(option: HeritageOption) {
    setSelected(option);
    setKeyword(option.name);
    setPickerOpen(false);
    setError(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;

    const accepted: PickedImage[] = [];
    let message: string | null = null;

    for (const file of picked) {
      if (images.length + accepted.length >= MAX_IMAGES) {
        message = `最多上传 ${MAX_IMAGES} 张图片`;
        break;
      }
      if (!file.type.startsWith("image/")) {
        message = "仅支持 JPG / PNG / WEBP 图片";
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        message = `单张图片不能超过 ${MAX_IMAGE_BYTES / 1024 / 1024}MB`;
        continue;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }

    setImages((current) => [...current, ...accepted]);
    setError(message);
    event.target.value = "";
  }

  function removeImage(url: string) {
    URL.revokeObjectURL(url);
    setImages((current) => current.filter((image) => image.url !== url));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!selected) {
      setError("请先选择要记录的文保点");
      return;
    }
    if (!body.trim()) {
      setError("请填写文字内容");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const form = new FormData();
      form.append("heritagePid", selected.pid);
      form.append("title", title.trim());
      form.append("body", body.trim());
      images.forEach((image) => form.append("images", image.file));

      const response = await fetch("/api/user-contents", {
        method: "POST",
        body: form,
      });
      const json = (await response.json()) as {
        success?: boolean;
        data?: UserContentItem;
        error?: string;
      };

      if (!response.ok || !json.success || !json.data) {
        setError(json.error ?? "保存失败，请稍后重试");
        return;
      }

      setItems((current) => [json.data as UserContentItem, ...current]);
      setTitle("");
      setBody("");
      images.forEach((image) => URL.revokeObjectURL(image.url));
      setImages([]);
      setNotice(`已保存到「${json.data.heritageName}」的记录中`);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: number) {
    if (deletingId !== null) return;
    if (!window.confirm("确定删除这条记录吗？删除后无法恢复。")) return;

    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/user-contents/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !json.success) {
        setError(json.error ?? "删除失败");
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
      setNotice("记录已删除");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.section}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>录入我的文字与图片</h2>
          <span className={styles.cardHint}>文保点来源：西安市文保点数据层（485 处）</span>
        </div>

        <form className={styles.fieldGrid} onSubmit={handleSubmit}>
          <div className={styles.field} ref={pickerRef}>
            <span className={styles.label}>选择文保点</span>
            <div className={styles.picker}>
              <input
                className={styles.input}
                value={keyword}
                placeholder="输入文保点名称、编号或区县，如「大雁塔」「P302」「碑林区」"
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setSelected(null);
                  setPickerOpen(true);
                }}
                onFocus={() => setPickerOpen(true)}
                aria-label="搜索文保点"
              />
              {pickerOpen && (
                <ul className={styles.pickerList} role="listbox" aria-label="文保点候选">
                  {optionsError ? (
                    <li className={styles.hint}>{optionsError}</li>
                  ) : filtered.length === 0 ? (
                    <li className={styles.hint}>
                      {options.length === 0 ? "正在加载文保点…" : "没有匹配的文保点"}
                    </li>
                  ) : (
                    filtered.map((option) => (
                      <li key={option.pid}>
                        <button
                          type="button"
                          className={styles.pickerItem}
                          onClick={() => pickOption(option)}
                        >
                          <span className={styles.pickerName}>{option.name}</span>
                          <span className={styles.pickerMeta}>
                            {[option.pid, option.district, option.category]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className={styles.pickerActions}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSmall}`}
                onClick={() => {
                  setPickerOpen(false);
                  setMapOpen(true);
                }}
                disabled={options.length === 0}
              >
                在地图上选点
              </button>
              <span className={styles.hint}>两种方式任选其一：输入名称搜索，或直接在地图上点选</span>
            </div>

            {selected && (
              <div className={styles.selectedHeritage}>
                <strong>{selected.name}</strong>
                <span className={styles.tag}>{selected.pid}</span>
                {selected.district && <span className={styles.tag}>{selected.district}</span>}
                {selected.category && <span className={styles.tag}>{selected.category}</span>}
                {selected.lng !== null && selected.lat !== null && (
                  <span className={styles.hint}>
                    {selected.lng.toFixed(6)}, {selected.lat.toFixed(6)}
                  </span>
                )}
              </div>
            )}
          </div>

          <label className={styles.field}>
            <span className={styles.label}>标题（可选）</span>
            <input
              className={styles.input}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="给这段记录起一个标题"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>我的文字</span>
            <textarea
              className={styles.textarea}
              value={body}
              maxLength={BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
              placeholder="写下你在这里看到的、想到的，或与它有关的一段记忆。"
              rows={5}
            />
            <span className={styles.hint}>
              {body.length} / {BODY_MAX} 字
            </span>
          </label>

          <div className={styles.field}>
            <span className={styles.label}>图片（可选，最多 {MAX_IMAGES} 张）</span>
            <div className={styles.uploadRow}>
              <input
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                disabled={images.length >= MAX_IMAGES}
              />
              <span className={styles.hint}>支持 JPG / PNG / WEBP，单张不超过 6MB</span>
            </div>
            {images.length > 0 && (
              <div className={styles.previews}>
                {images.map((image) => (
                  <div className={styles.previewItem} key={image.url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.file.name} />
                    <button
                      type="button"
                      className={styles.previewRemove}
                      onClick={() => removeImage(image.url)}
                      aria-label={`移除 ${image.file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className={styles.alert} role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={pending}>
              {pending ? "正在保存…" : "保存记录"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>我的记录</h2>
          <span className={styles.cardHint}>共 {items.length} 条</span>
        </div>

        {items.length === 0 ? (
          <p className={styles.empty}>
            还没有录入内容。选择一处文保点，写下你的第一段记录吧。
          </p>
        ) : (
          <ul className={styles.recordList}>
            {items.map((item) => (
              <li className={styles.record} key={item.id}>
                <div className={styles.recordHead}>
                  <h3 className={styles.recordTitle}>{item.title || item.heritageName}</h3>
                  <span className={styles.recordMeta}>
                    {formatDateTime(item.createdAt)}
                    {item.status === "hidden" && " · 已被管理员隐藏"}
                  </span>
                </div>
                <p className={styles.recordMeta}>
                  {item.heritageName} · {item.heritagePid}
                </p>
                <p className={styles.recordBody}>{item.body}</p>
                {item.images.length > 0 && (
                  <div className={styles.recordImages}>
                    {item.images.map((image) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={image.id} src={image.url} alt={`${item.heritageName} 图片`} />
                    ))}
                  </div>
                )}
                <div className={styles.recordFooter}>
                  <span className={styles.hint}>
                    {item.images.length > 0 ? `${item.images.length} 张图片` : "无图片"}
                  </span>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSmall}`}
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "删除中…" : "删除"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mapOpen && (
        <HeritageMapPicker
          points={options}
          selectedPid={selected?.pid ?? null}
          onPick={(option) => {
            setSelected(option);
            setKeyword(option.name);
            setMapOpen(false);
            setError(null);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}
