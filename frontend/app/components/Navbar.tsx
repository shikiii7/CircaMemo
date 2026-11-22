"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import {
  MAP_SEARCH_SELECT_EVENT,
  type MapSearchItem,
  type MapSearchResponse,
} from "@/lib/mapSearch";
import { formatSearchTemporalValue } from "@/lib/mapSearchTemporal";
import AuthNav from "./AuthNav";
import styles from "./Navbar.module.css";

const SEARCH_KIND_LABELS: Record<MapSearchItem["kind"], string> = {
  heritage: "遗产点",
  area: "历史区域",
  "national-heritage": "全国文保",
  ich: "国家级非遗",
  mingren: "唐代名人",
  fang: "唐108坊",
};

function getResultMeta(item: MapSearchItem): string {
  return [item.category, item.period, item.district].filter(Boolean).join(" · ");
}

function hasTemporalValue(item: MapSearchItem): boolean {
  return item.kind !== "ich" && item.kind !== "fang";
}

export default function Navbar() {
  const listboxId = useId();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchRequestIdRef = useRef(0);
  const skipNextQueryRef = useRef<string | null>(null);
  const [results, setResults] = useState<MapSearchItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedQuery = query.trim();
  const showDropdown = open && normalizedQuery.length > 0;

  useEffect(() => {
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    if (!normalizedQuery) return;
    if (skipNextQueryRef.current === normalizedQuery) {
      skipNextQueryRef.current = null;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/map-search?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal },
        );
        const json = (await response.json()) as MapSearchResponse;
        if (!response.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error("Invalid map search response");
        }
        if (requestId === searchRequestIdRef.current) setResults(json.data);
      } catch (nextError) {
        if (controller.signal.aborted || requestId !== searchRequestIdRef.current) return;
        console.error("Failed to load map search results:", nextError);
        setResults([]);
        setError("搜索数据暂时无法加载");
      } finally {
        if (!controller.signal.aborted && requestId === searchRequestIdRef.current) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function selectResult(item: MapSearchItem) {
    skipNextQueryRef.current = item.name.trim();
    setQuery(item.name);
    setLoading(false);
    setError(null);
    setOpen(false);
    setActiveIndex(-1);
    window.dispatchEvent(
      new CustomEvent<MapSearchItem>(MAP_SEARCH_SELECT_EVENT, { detail: item }),
    );
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setLoading(false);
    setError(null);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!showDropdown) setOpen(true);
      if (results.length > 0) {
        setActiveIndex((current) => (current + 1) % results.length);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!showDropdown) setOpen(true);
      if (results.length > 0) {
        setActiveIndex((current) =>
          current <= 0 ? results.length - 1 : current - 1,
        );
      }
      return;
    }

    if (event.key === "Enter") {
      const selected = results[activeIndex] ?? results[0];
      if (selected) {
        event.preventDefault();
        selectResult(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>
        <Image
          className={styles.brandLogo}
          src="/images/brand/circamemo-logo-white-transparent.png"
          alt="CircaMemo 标志"
          width={38}
          height={38}
          priority
        />
        忆城舆图 <span className={styles.brandEnglish}>CircaMemo</span>
      </span>

      <div className={styles.searchShell} ref={searchRef}>
        <div className={styles.searchField}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label className={styles.srOnly} htmlFor="map-search-input">
            搜索遗产、人名或坊名
          </label>
          <input
            id="map-search-input"
            className={styles.input}
            type="search"
            role="combobox"
            value={query}
            placeholder="搜索遗产 / 人名 / 坊名…"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showDropdown}
            aria-activedescendant={
              showDropdown && activeIndex >= 0
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              const nextQuery = event.target.value;
              skipNextQueryRef.current = null;
              setQuery(nextQuery);
              setLoading(Boolean(nextQuery.trim()));
              setError(null);
              if (!nextQuery.trim()) setResults([]);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className={styles.clearButton}
              type="button"
              aria-label="清除搜索"
              onClick={clearSearch}
            >
              ×
            </button>
          )}
        </div>

        {showDropdown && (
          <div className={styles.dropdown}>
            {loading ? (
              <div className={styles.state} role="status">
                正在搜索…
              </div>
            ) : error ? (
              <div className={styles.state} role="status">
                <strong>{error}</strong>
                请稍后重试
              </div>
            ) : results.length === 0 ? (
              <div className={styles.state} role="status">
                <strong>没有找到匹配地点</strong>
                可以尝试遗产名称、人名、坊名或编号
              </div>
            ) : (
              <ul className={styles.resultList} id={listboxId} role="listbox">
                {results.map((item, index) => (
                  <li key={`${item.kind}:${item.id}`} role="presentation">
                    <button
                      id={`${listboxId}-option-${index}`}
                      className={styles.resultButton}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      data-active={index === activeIndex ? "true" : "false"}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectResult(item)}
                    >
                      <span className={styles.resultIcon} data-kind={item.kind} aria-hidden="true">
                        {item.kind === "area" || item.kind === "fang" ? "域" : "点"}
                      </span>
                      <span className={styles.resultCopy}>
                        <span className={styles.resultName}>{item.name}</span>
                        {hasTemporalValue(item) && (
                          <span className={styles.resultTime}>
                            {formatSearchTemporalValue(item)}
                          </span>
                        )}
                        <span className={styles.resultMeta}>{getResultMeta(item)}</span>
                      </span>
                      <span className={styles.resultKind}>
                        {SEARCH_KIND_LABELS[item.kind]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={styles.navLinks}>
        <span className={styles.navLinkActive}>地图</span>
        <a href="#site-footer" className={styles.navLinkMuted}>
          关于
        </a>
        <AuthNav />
      </div>
    </nav>
  );
}
