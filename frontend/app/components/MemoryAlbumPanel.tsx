"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  type MemoryAlbumBlock,
  type MemoryAlbumData,
  type MemoryAlbumImage,
  type MemoryAlbumPage,
  type MemoryAlbumTimelineEvent,
  MemoryAlbumDataError,
  parseMemoryAlbum,
} from "@/lib/memoryAlbum";
import styles from "./MemoryAlbumPanel.module.css";

type Props = {
  file: string;
  expectedPid: string;
  onClose: () => void;
};

function ImageFigure({
  image,
  compact = false,
}: {
  image: MemoryAlbumImage;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <figure
      className={`${styles.figure} ${compact ? styles.compactFigure : ""}`}
      data-compact={compact ? "true" : "false"}
    >
      <div className={styles.imageFrame}>
        {failed ? (
          <div className={styles.imageFallback} role="img" aria-label={image.alt}>
            <span aria-hidden="true">▧</span>
            图片暂时无法加载
          </div>
        ) : (
          <Image
            src={image.path}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={compact ? "(max-width: 640px) 100vw, 260px" : "(max-width: 760px) 100vw, 760px"}
            className={styles.albumImage}
            onError={() => setFailed(true)}
            unoptimized
          />
        )}
        <span className={styles.dateStamp}>{image.dateLabel}</span>
      </div>
      <figcaption>
        <strong>{image.caption}</strong>
        <span>{image.attribution}</span>
      </figcaption>
    </figure>
  );
}

function ContentBlocks({ blocks }: { blocks: MemoryAlbumBlock[] }) {
  return (
    <div className={styles.blocks}>
      {blocks.map((block, index) => {
        if (block.kind === "fact") {
          return (
            <section className={styles.factBlock} key={`${block.kind}-${index}`}>
              {block.heading && <h3>{block.heading}</h3>}
              <p>{block.text}</p>
            </section>
          );
        }
        if (block.kind === "note") {
          return (
            <p className={styles.noteBlock} key={`${block.kind}-${index}`}>
              <span aria-hidden="true">※</span>
              {block.text}
            </p>
          );
        }
        return (
          <p
            className={block.kind === "lead" ? styles.leadBlock : styles.paragraphBlock}
            key={`${block.kind}-${index}`}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function PhysicalCover({ album }: { album: MemoryAlbumData }) {
  return (
    <article className={styles.physicalCover} aria-label="相册封皮">
      <span className={styles.coverEdge} aria-hidden="true" />
      <span className={styles.coverSpine} aria-hidden="true" />
      <span className={styles.coverLacing} aria-hidden="true">
        <i /><i /><i /><i />
        <svg viewBox="0 0 68 560" fill="none">
          <path d="M25 78 58 202 25 209 58 339 25 343 58 467" />
          <path d="m25 78 32-22M25 474l30 28" />
        </svg>
      </span>
      <svg className={styles.coverIllustration} viewBox="0 0 365 418" fill="none" aria-hidden="true">
        <path d="M181 385V188M181 217c-49-16-82-61-91-118 42 6 73 27 91 66 12-57 44-96 91-116 2 55-23 102-91 149Z" />
        <path d="M181 287c-56 8-95 38-118 82M181 287c54 7 94 34 121 78M181 315c-27 22-46 47-58 75M181 315c29 19 52 43 69 72" />
        <path d="M41 264c35-21 64-19 87 5M48 280c29-8 52-3 70 14" />
        <path d="M259 246c21 0 38 17 38 38s-17 38-38 38c18-9 26-22 26-38s-8-29-26-38Z" />
        <circle cx="69" cy="76" r="25" />
        <path d="M69 34V15M69 137v-19M27 76H8M130 76h-19M39 46 25 32M113 120l-14-14M99 46l14-14M25 120l14-14" />
        <path d="M75 213c14-19 31-29 50-29 15 0 24 8 31 24-9 18-21 29-37 35-18-7-33-17-44-30Z" />
        <path d="m97 197-12-17M128 198l12-19" />
      </svg>
      <div className={styles.coverDeboss}>
        <span>1958 — TODAY</span>
        <strong>兴庆<br />城记</strong>
        <i aria-hidden="true" />
        <p>{album.binding.primaryName}：一座公园，<br />几代人的共同记忆</p>
        <small>共同建园 · 大象滑梯 · 旧园新生</small>
      </div>
      <span className={styles.coverCharm} aria-hidden="true">{album.binding.primaryPid}</span>
      <span className={`${styles.brassCorner} ${styles.brassCornerTop}`} aria-hidden="true" />
      <span className={`${styles.brassCorner} ${styles.brassCornerBottom}`} aria-hidden="true" />
      <span className={styles.edgeClasp} aria-hidden="true" />
    </article>
  );
}

type AlbumLeafPage = {
  id: string;
  chapterId: string;
  eyebrow: string;
  title: string;
  sourceIds: string[];
} & (
  | { kind: "title"; page: MemoryAlbumPage }
  | { kind: "photo"; image: MemoryAlbumImage; blocks?: MemoryAlbumBlock[] }
  | { kind: "narrative"; blocks: MemoryAlbumBlock[] }
  | { kind: "timeline"; events: MemoryAlbumTimelineEvent[] }
  | { kind: "credits-intro"; page: MemoryAlbumPage }
  | { kind: "sources-index"; sources: MemoryAlbumData["sources"]; startIndex: number }
  | { kind: "image-sources-index"; images: MemoryAlbumImage[]; startIndex: number }
);

type AlbumChapter = {
  id: string;
  label: string;
  pageIndex: number;
};

const SOURCE_INDEX_PAGE_SIZE = 6;
const IMAGE_SOURCE_INDEX_PAGE_SIZE = 6;

function buildLeafPages(album: MemoryAlbumData): { pages: AlbumLeafPage[]; chapters: AlbumChapter[] } {
  const dataPages = [...album.pages].sort((left, right) => left.order - right.order);
  const leafPages: AlbumLeafPage[] = [];
  const chapters: AlbumChapter[] = [];

  for (const dataPage of dataPages) {
    chapters.push({
      id: dataPage.id,
      label: dataPage.order === 1 ? "扉页" : dataPage.title,
      pageIndex: leafPages.length,
    });
    const common = {
      chapterId: dataPage.id,
      eyebrow: dataPage.eyebrow,
      title: dataPage.title,
      sourceIds: dataPage.sourceIds,
    };
    const images = dataPage.imageIds
      .map((id) => album.images.find((image) => image.id === id))
      .filter((image): image is MemoryAlbumImage => Boolean(image));

    if (dataPage.type === "cover") {
      leafPages.push({ ...common, sourceIds: [], id: `${dataPage.id}-title`, kind: "title", page: dataPage });
      leafPages.push({
        ...common,
        id: `${dataPage.id}-introduction`,
        kind: "narrative",
        eyebrow: "相册导读",
        title: "一座公园，几代人的生活",
        blocks: [{ kind: "paragraph", text: album.summary }, ...dataPage.blocks],
      });
      continue;
    }

    if (dataPage.type === "feature") {
      images.forEach((image, index) => {
        leafPages.push({
          ...common,
          id: `${dataPage.id}-photo-${index + 1}`,
          kind: "photo",
          image,
        });
      });
      for (let index = 0; index < dataPage.blocks.length; index += 2) {
        leafPages.push({
          ...common,
          id: `${dataPage.id}-story-${index / 2 + 1}`,
          kind: "narrative",
          blocks: dataPage.blocks.slice(index, index + 2),
        });
      }
      continue;
    }

    if (dataPage.type === "timeline") {
      for (let index = 0; index < dataPage.blocks.length; index += 2) {
        leafPages.push({
          ...common,
          id: `${dataPage.id}-story-${index / 2 + 1}`,
          kind: "narrative",
          blocks: dataPage.blocks.slice(index, index + 2),
        });
      }
      for (let index = 0; index < album.timeline.length; index += 2) {
        leafPages.push({
          ...common,
          id: `${dataPage.id}-timeline-${index / 2 + 1}`,
          kind: "timeline",
          title: index === 0 ? "从共同建园到人民公园" : "时间继续向前",
          events: album.timeline.slice(index, index + 2),
        });
      }
      images.forEach((image, index) => {
        leafPages.push({
          ...common,
          id: `${dataPage.id}-photo-${index + 1}`,
          kind: "photo",
          title: "公园影像档案",
          image,
        });
      });
      continue;
    }

    leafPages.push({ ...common, id: `${dataPage.id}-intro`, kind: "credits-intro", page: dataPage });
    for (let index = 0; index < album.sources.length; index += SOURCE_INDEX_PAGE_SIZE) {
      leafPages.push({
        ...common,
        id: `${dataPage.id}-sources-${index / SOURCE_INDEX_PAGE_SIZE + 1}`,
        kind: "sources-index",
        title: "文章来源",
        sources: album.sources.slice(index, index + SOURCE_INDEX_PAGE_SIZE),
        startIndex: index,
      });
    }
    for (let index = 0; index < album.images.length; index += IMAGE_SOURCE_INDEX_PAGE_SIZE) {
      leafPages.push({
        ...common,
        id: `${dataPage.id}-image-sources-${index / IMAGE_SOURCE_INDEX_PAGE_SIZE + 1}`,
        kind: "image-sources-index",
        title: "图片来源",
        images: album.images.slice(index, index + IMAGE_SOURCE_INDEX_PAGE_SIZE),
        startIndex: index,
      });
    }
  }

  return { pages: leafPages, chapters };
}

function PageHeading({ page, counter }: { page: AlbumLeafPage; counter?: string }) {
  return (
    <header className={styles.pageIntro}>
      <div className={styles.headingMeta}>
        <p className={styles.kicker}>{page.eyebrow}</p>
        {counter && <span>{counter}</span>}
      </div>
      <h2>{page.title}</h2>
    </header>
  );
}

function TitlePage({ album, page }: { album: MemoryAlbumData; page: MemoryAlbumPage }) {
  const cover = album.images.find((image) => image.id === album.coverImageId);
  return (
    <div className={styles.titlePage}>
      <header className={styles.coverHeading}>
        <p className={styles.coverSeries}>城市记忆档案 · {album.binding.primaryPid}</p>
        <p className={styles.coverEyebrow}>{page.eyebrow}</p>
        <h2>{album.title}</h2>
        <p className={styles.coverSubtitle}>{album.subtitle}</p>
      </header>

      <div className={styles.coverLayout}>
        {cover && <div className={styles.coverPhoto}><ImageFigure image={cover} /></div>}
        <div className={styles.coverCopy}>
          <div className={styles.coverRule} aria-hidden="true"><i /><span>兴庆城记</span><i /></div>
        </div>
      </div>

      <footer className={styles.coverImprint}>
        <span>{album.binding.primaryName}</span>
        <span>卷一 · 城市公共记忆</span>
      </footer>
    </div>
  );
}

function PhotoPage({ page }: { page: Extract<AlbumLeafPage, { kind: "photo" }> }) {
  return (
    <div className={styles.featureLayout}>
      <PageHeading page={page} />
      <div className={styles.heroPhoto}><ImageFigure image={page.image} /></div>
      {page.blocks && <ContentBlocks blocks={page.blocks} />}
    </div>
  );
}

function NarrativePage({ page }: { page: Extract<AlbumLeafPage, { kind: "narrative" }> }) {
  return (
    <div className={styles.narrativePage}>
      <PageHeading page={page} />
      <ContentBlocks blocks={page.blocks} />
    </div>
  );
}

function TimelineLeafPage({ page }: { page: Extract<AlbumLeafPage, { kind: "timeline" }> }) {
  return (
    <div className={styles.timelinePage}>
      <PageHeading page={page} />
      <ol className={styles.timeline} aria-label="兴庆宫公园记忆时间线">
        {page.events.map((event) => (
          <li key={event.id}>
            <time dateTime={event.date}>{event.dateLabel}</time>
            <div><h3>{event.title}</h3><p>{event.text}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CreditsIntroPage({ album, page }: { album: MemoryAlbumData; page: Extract<AlbumLeafPage, { kind: "credits-intro" }> }) {
  return (
    <div className={styles.creditsIntroPage}>
      <PageHeading page={page} />
      <ContentBlocks blocks={page.page.blocks} />
      <div className={styles.archiveCounts}>
        <div><strong>{album.sources.length}</strong><span>篇文章来源</span></div>
        <div><strong>{album.images.length}</strong><span>张图片档案</span></div>
      </div>
      {album.binding.related.length > 0 && (
        <section className={styles.relatedSummary} aria-label="关联遗产点">
          <h3>关联遗产点</h3>
          {album.binding.related.map((item) => (
            <div key={item.pid}>
              <strong>{item.pid} · {item.name}</strong>
              <p>{item.relationship}</p>
              <small>不复制相册：{item.duplicateAlbum ? "是" : "否"}</small>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SourcesIndexPage({ album, page }: { album: MemoryAlbumData; page: Extract<AlbumLeafPage, { kind: "sources-index" }> }) {
  return (
    <div className={styles.sourcesIndexPage}>
      <PageHeading page={page} counter={`${album.sources.length} 篇`} />
      <ol
        className={styles.sourceIndex}
        aria-label={`文章来源目录 ${page.startIndex + 1}-${page.startIndex + page.sources.length}`}
      >
        {page.sources.map((source, index) => (
          <li key={source.id}>
            <span className={styles.indexNumber}>{String(page.startIndex + index + 1).padStart(2, "0")}</span>
            <div>
              <h3><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></h3>
              <p className={styles.indexMeta}>
                <strong>{source.publisher}</strong>
                <span>{source.publicationDate ?? "日期未标示"}</span>
                {source.authors.length > 0 && <span>{source.authors.join("、")}</span>}
              </p>
              {source.dateNote && <p className={styles.indexDateNote}>{source.dateNote}</p>}
              <p className={styles.indexUsage}>{source.usage.join("；")}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ImageSourcesIndexPage({ album, page }: { album: MemoryAlbumData; page: Extract<AlbumLeafPage, { kind: "image-sources-index" }> }) {
  return (
    <div className={styles.imageSourcesIndexPage}>
      <PageHeading page={page} counter={`${page.startIndex + 1}–${page.startIndex + page.images.length} / ${album.images.length} 张`} />
      <ol
        className={styles.imageSourcesIndex}
        aria-label={`图片来源目录 ${page.startIndex + 1}-${page.startIndex + page.images.length}`}
      >
        {page.images.map((image, index) => (
          <li key={image.id}>
            <span className={styles.indexNumber}>{String(page.startIndex + index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{image.caption}</h3>
              <p className={styles.indexMeta}>
                <strong>{image.creator}</strong>
                <span>{image.dateLabel}</span>
                {image.license && <span>{image.license}</span>}
              </p>
              <p className={styles.imageAttribution}>{image.attribution}</p>
              <p className={styles.indexLinks}>
                <a href={image.sourceUrl} target="_blank" rel="noreferrer">图片来源 ↗</a>
                {image.licenseUrl && <a href={image.licenseUrl} target="_blank" rel="noreferrer">许可条款 ↗</a>}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {page.startIndex === 0 && (
        <p className={styles.archiveNote}>图片均保留来源页面与署名；完整的处理记录、文件尺寸与校验值保留在相册内容包中。</p>
      )}
    </div>
  );
}

type PageSide = "left" | "right";

function AlbumPaper({
  album,
  page,
  pageNumber,
  side,
  headingRef,
}: {
  album: MemoryAlbumData;
  page: AlbumLeafPage | undefined;
  pageNumber: number | undefined;
  side: PageSide;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  if (!page || pageNumber === undefined) {
    return (
      <section className={`${styles.paperPage} ${styles.blankPage}`} data-side={side} aria-label="相册衬页">
        <span aria-hidden="true">兴庆城记</span>
      </section>
    );
  }

  return (
    <section
      className={styles.paperPage}
      data-page-type={page.kind}
      data-side={side}
      aria-label={`第 ${pageNumber} 页：${pageNumber === 1 ? "扉页" : page.title}`}
    >
      <div className={styles.pageCanvas}>
        <h2 className={styles.srOnly} ref={headingRef} tabIndex={-1}>{page.title}</h2>
        {page.kind === "title" && <TitlePage album={album} page={page.page} />}
        {page.kind === "photo" && <PhotoPage page={page} />}
        {page.kind === "narrative" && <NarrativePage page={page} />}
        {page.kind === "timeline" && <TimelineLeafPage page={page} />}
        {page.kind === "credits-intro" && <CreditsIntroPage album={album} page={page} />}
        {page.kind === "sources-index" && <SourcesIndexPage album={album} page={page} />}
        {page.kind === "image-sources-index" && <ImageSourcesIndexPage album={album} page={page} />}
      </div>
      <span className={styles.printedPageNumber} aria-hidden="true">{String(pageNumber).padStart(2, "0")}</span>
    </section>
  );
}

function AlbumSpread({
  album,
  pages,
  firstPageIndex,
  singlePage,
  headingRef,
}: {
  album: MemoryAlbumData;
  pages: AlbumLeafPage[];
  firstPageIndex: number;
  singlePage: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className={styles.spread} data-single-page={singlePage ? "true" : "false"} data-page-start={firstPageIndex + 1}>
      <AlbumPaper
        album={album}
        page={pages[firstPageIndex]}
        pageNumber={firstPageIndex + 1}
        side="left"
        headingRef={headingRef}
      />
      {!singlePage && <>
        <span className={styles.gutter} aria-hidden="true" />
        <AlbumPaper
          album={album}
          page={pages[firstPageIndex + 1]}
          pageNumber={pages[firstPageIndex + 1] ? firstPageIndex + 2 : undefined}
          side="right"
        />
      </>}
    </div>
  );
}

export default function MemoryAlbumPanel({ file, expectedPid, onClose }: Props) {
  const [album, setAlbum] = useState<MemoryAlbumData | null>(null);
  const [isCoverClosed, setIsCoverClosed] = useState(true);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pendingPageIndex, setPendingPageIndex] = useState<number | null>(null);
  const [isSinglePage, setIsSinglePage] = useState(false);
  const [turnDirection, setTurnDirection] = useState<"forward" | "backward" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAlbum() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(file, { signal: controller.signal });
        if (!response.ok) throw new Error(`Memory album request failed: ${response.status}`);
        let nextAlbum: MemoryAlbumData;
        try {
          nextAlbum = parseMemoryAlbum(await response.json());
        } catch (parseError) {
          if (parseError instanceof MemoryAlbumDataError || parseError instanceof SyntaxError) {
            throw new MemoryAlbumDataError(parseError.message);
          }
          throw parseError;
        }
        if (nextAlbum.binding.primaryPid !== expectedPid) {
          throw new Error("Memory album PID does not match its index entry");
        }
        setAlbum(nextAlbum);
        setIsCoverClosed(true);
        setActivePageIndex(0);
        setPendingPageIndex(null);
        setTurnDirection(null);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.warn("Failed to load memory album:", loadError);
        setAlbum(null);
        setError(loadError instanceof MemoryAlbumDataError ? "相册数据格式异常，请稍后再试。" : "相册暂时无法打开，请稍后重试。" );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadAlbum();
    return () => controller.abort();
  }, [expectedPid, file, retryKey]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const updateLayout = () => {
      setIsSinglePage(query.matches);
      setActivePageIndex((index) => query.matches ? index : Math.floor(index / 2) * 2);
    };
    updateLayout();
    query.addEventListener?.("change", updateLayout);
    return () => query.removeEventListener?.("change", updateLayout);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), details summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      previousFocus?.focus();
    };
  }, []);

  const albumBook = useMemo(
    () => album ? buildLeafPages(album) : { pages: [], chapters: [] },
    [album],
  );
  const { pages, chapters } = albumBook;
  const pageStep = isSinglePage ? 1 : 2;
  const isTurning = pendingPageIndex !== null || turnDirection !== null;

  function prefersReducedMotion() {
    return typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function resetReadingPosition(moveFocus = false) {
    const content = contentRef.current;
    if (content && typeof content.scrollTo === "function") content.scrollTo({ top: 0, behavior: "smooth" });
    else if (content) content.scrollTop = 0;
    if (moveFocus) window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function openAlbum(moveFocus = false) {
    if (isTurning) return;
    if (prefersReducedMotion()) {
      setIsCoverClosed(false);
      setActivePageIndex(0);
      resetReadingPosition(moveFocus);
      return;
    }
    setTurnDirection("forward");
    setPendingPageIndex(0);
    if (moveFocus) window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function goToPage(index: number, moveFocus = false) {
    const targetIndex = isSinglePage ? index : Math.floor(index / 2) * 2;
    if (isTurning || targetIndex < 0 || targetIndex >= pages.length) return;
    if (isCoverClosed) {
      openAlbum(moveFocus);
      return;
    }
    if (targetIndex === activePageIndex) {
      resetReadingPosition(moveFocus);
      return;
    }
    if (prefersReducedMotion()) {
      setActivePageIndex(targetIndex);
      resetReadingPosition(moveFocus);
      return;
    }
    setTurnDirection(targetIndex > activePageIndex ? "forward" : "backward");
    setPendingPageIndex(targetIndex);
  }

  function closeCover() {
    if (isTurning || isCoverClosed) return;
    if (prefersReducedMotion()) {
      setIsCoverClosed(true);
      setActivePageIndex(0);
      resetReadingPosition(false);
      return;
    }
    setTurnDirection("backward");
    setPendingPageIndex(-1);
  }

  function finishTurn() {
    if (pendingPageIndex === null) return;
    if (pendingPageIndex === -1) {
      setIsCoverClosed(true);
      setActivePageIndex(0);
    } else {
      setIsCoverClosed(false);
      setActivePageIndex(pendingPageIndex);
    }
    setPendingPageIndex(null);
    setTurnDirection(null);
    resetReadingPosition(true);
  }

  const visiblePageIndex = pendingPageIndex !== null && pendingPageIndex >= 0 ? pendingPageIndex : activePageIndex;
  const visibleChapterIds = new Set(pages.slice(visiblePageIndex, visiblePageIndex + pageStep).map((page) => page.chapterId));
  const currentFirstPage = activePageIndex + 1;
  const currentLastPage = Math.min(activePageIndex + pageStep, pages.length);
  const paginationLabel = currentFirstPage === currentLastPage
    ? `${currentFirstPage} / ${pages.length}`
    : `${currentFirstPage}–${currentLastPage} / ${pages.length}`;

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.albumIdentity}>
            <span>{album?.binding.primaryPid ?? expectedPid} · 私藏城市记忆</span>
            <strong id={titleId}>{album?.title ?? "正在翻开相册"}</strong>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="关闭记忆相册">✕</button>
        </header>

        {loading && (
          <div className={styles.state} role="status">
            <span className={styles.loadingMark} aria-hidden="true" />
            <strong>正在翻开相册</strong>
            <p>整理照片与时间线……</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.state} role="alert">
            <span className={styles.errorMark} aria-hidden="true">!</span>
            <strong>{error}</strong>
            <div className={styles.stateActions}>
              <button onClick={() => setRetryKey((value) => value + 1)}>重试</button>
              <button onClick={onClose}>关闭</button>
            </div>
          </div>
        )}

        {!loading && !error && album && pages.length > 0 && (
          <div className={styles.albumShell} data-cover-closed={isCoverClosed && pendingPageIndex === null ? "true" : "false"}>
            {isCoverClosed && pendingPageIndex === null ? (
              <main className={styles.coverStage} ref={contentRef}>
                <div className={styles.deskStillLife} aria-hidden="true">
                  <span className={styles.memoryPhoto}>
                    <i>兴庆湖 · 2019</i>
                  </span>
                  <span className={styles.archiveMap}>
                    <svg viewBox="0 0 320 220" fill="none">
                      <path className={styles.mapGrid} d="M40 0v220M80 0v220M120 0v220M160 0v220M200 0v220M240 0v220M280 0v220M0 35h320M0 70h320M0 105h320M0 140h320M0 175h320" />
                      <path className={styles.mapWater} d="M-8 147c36-22 60 8 94-14 42-27 75 9 111-18 30-23 55-7 76 10 21 16 37 16 57 5" />
                      <path className={styles.mapWater} d="M12 165c31-16 55 6 83-10 39-22 72 12 108-13 24-17 45-7 67 8" />
                      <path className={styles.mapLandmark} d="M191 116V81h53v31M201 81l16-19 17 19M208 81V69M226 81V69M81 143v-29h37v26M88 114l12-15 12 15" />
                      <circle className={styles.mapPin} cx="218" cy="104" r="7" />
                    </svg>
                    <b>兴庆宫城市记忆档案</b>
                    <i>34°15′57″ N · 108°58′54″ E</i>
                    <small>XINGQING</small>
                  </span>
                  <span className={styles.archiveTicket}>
                    <b>西安城市记忆</b>
                    <i>ARCHIVE</i>
                    <small>1958 — TODAY</small>
                  </span>
                  <span className={styles.vermilionSeal}>兴庆<br />记忆</span>
                  <span className={styles.fountainPen}>
                    <i />
                    <b />
                  </span>
                  <svg className={styles.looseCord} viewBox="0 0 220 120" fill="none">
                    <path d="M6 89c41-66 83 28 126-35 24-35 48-18 78 12" />
                    <path d="M180 67c18 12 23 27 29 45" />
                  </svg>
                </div>
                <PhysicalCover album={album} />
              </main>
            ) : (
              <>
                <div className={styles.binding} aria-hidden="true"><i /><i /><i /><i /></div>
                <nav className={styles.pageNav} aria-label="相册目录">
                  <div className={styles.spineMark} aria-hidden="true">兴庆宫 · XINGQING</div>
                  <ol>
                    {chapters.map((chapter, index) => (
                      <li key={chapter.id}>
                        <button
                          onClick={() => goToPage(chapter.pageIndex, true)}
                          aria-current={visibleChapterIds.has(chapter.id) ? "page" : undefined}
                          disabled={isTurning}
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          {chapter.label}
                        </button>
                      </li>
                    ))}
                  </ol>
                  <small>v{album.contentVersion}<br />{album.binding.primaryPid}</small>
                </nav>

                <main className={styles.bookViewport} ref={contentRef} aria-label="相册内页">
                  <AlbumSpread
                    album={album}
                    pages={pages}
                    firstPageIndex={visiblePageIndex}
                    singlePage={isSinglePage}
                    headingRef={headingRef}
                  />
                  {turnDirection && pendingPageIndex !== null && (
                    <div
                      className={pendingPageIndex === -1 ? styles.coverTurn : styles.pageTurn}
                      data-direction={turnDirection}
                      aria-hidden="true"
                      onAnimationEnd={finishTurn}
                    >
                      {pendingPageIndex === -1 ? <PhysicalCover album={album} /> : <><span /><span /></>}
                    </div>
                  )}
                </main>
              </>
            )}

            {isCoverClosed && pendingPageIndex !== null && (
              <div
                className={styles.openingCover}
                data-direction="forward"
                aria-hidden="true"
                onAnimationEnd={finishTurn}
              >
                <PhysicalCover album={album} />
              </div>
            )}

            <footer className={styles.footer}>
              {isCoverClosed && pendingPageIndex === null ? (
                <>
                  <span aria-live="polite">封皮</span>
                  <button onClick={() => openAlbum(true)} disabled={isTurning}>翻开相册 →</button>
                </>
              ) : (
                <>
                  <button
                    onClick={activePageIndex === 0 ? closeCover : () => goToPage(Math.max(0, activePageIndex - pageStep), true)}
                    disabled={isTurning}
                  >
                    {activePageIndex === 0 ? "← 合上封皮" : "← 上一页"}
                  </button>
                  <span aria-live="polite">{paginationLabel}</span>
                  <button
                    onClick={() => goToPage(activePageIndex + pageStep, true)}
                    disabled={isTurning || activePageIndex + pageStep >= pages.length}
                  >
                    下一页 →
                  </button>
                </>
              )}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}