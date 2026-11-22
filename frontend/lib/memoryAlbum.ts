export type MemoryAlbumIndexEntry = {
  albumId: string;
  contentVersion: string;
  primaryPid: string;
  primaryName: string;
  title: string;
  coverImage: string;
  file: string;
};

export type MemoryAlbumIndex = {
  schemaVersion: "1.0";
  albums: MemoryAlbumIndexEntry[];
};

export type MemoryAlbumBlock = {
  kind: "lead" | "paragraph" | "fact" | "note";
  heading?: string;
  text: string;
};

export type MemoryAlbumPage = {
  id: string;
  type: "cover" | "feature" | "timeline" | "credits";
  order: number;
  eyebrow: string;
  title: string;
  blocks: MemoryAlbumBlock[];
  imageIds: string[];
  sourceIds: string[];
};

export type MemoryAlbumTimelineEvent = {
  id: string;
  date: string;
  dateLabel: string;
  title: string;
  text: string;
  sourceIds: string[];
};

export type MemoryAlbumArticleSource = {
  id: string;
  title: string;
  publisher: string;
  publicationDate: string | null;
  dateNote: string | null;
  authors: string[];
  url: string;
  usage: string[];
  textUseNote: string;
};

export type MemoryAlbumImage = {
  id: string;
  sourceAssetId: string;
  path: string;
  mimeType: "image/webp";
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  dateLabel: string;
  alt: string;
  caption: string;
  creator: string;
  sourceUrl: string;
  license?: string;
  licenseUrl?: string | null;
  attribution: string;
  changes: string[];
  source: {
    mimeType: string;
    width: number;
    height: number;
    bytes: number;
    sha256: string;
  };
  safety: {
    reviewed: boolean;
    recognizableMinors: boolean;
    notes: string;
  };
};

export type MemoryAlbumData = {
  schemaVersion: "1.0";
  albumId: string;
  contentVersion: string;
  status: "draft" | "static-content-ready";
  locale: string;
  createdAt: string;
  binding: {
    primaryPid: string;
    primaryName: string;
    related: Array<{
      pid: string;
      name: string;
      relationship: string;
      duplicateAlbum: false;
    }>;
  };
  title: string;
  subtitle: string;
  summary: string;
  coverImageId: string;
  editorialNotes: string[];
  pages: MemoryAlbumPage[];
  timeline: MemoryAlbumTimelineEvent[];
  sources: MemoryAlbumArticleSource[];
  images: MemoryAlbumImage[];
};

export class MemoryAlbumDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryAlbumDataError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && record[key] !== "";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function assertUniqueIds(items: unknown[], label: string) {
  const ids = items.map((item) => (isRecord(item) ? item.id : null));
  if (ids.some((id) => typeof id !== "string" || id === "")) {
    throw new MemoryAlbumDataError(`${label} contains an invalid ID`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new MemoryAlbumDataError(`${label} contains duplicate IDs`);
  }
}

function assertReferences(
  references: unknown,
  available: Set<string>,
  label: string,
) {
  if (!isStringArray(references) || references.some((id) => !available.has(id))) {
    throw new MemoryAlbumDataError(`${label} contains an unknown reference`);
  }
}

export function parseMemoryAlbumIndex(value: unknown): MemoryAlbumIndex {
  if (!isRecord(value) || value.schemaVersion !== "1.0" || !Array.isArray(value.albums)) {
    throw new MemoryAlbumDataError("Invalid memory album index");
  }

  const pids = new Set<string>();
  const albumIds = new Set<string>();
  for (const album of value.albums) {
    if (
      !isRecord(album) ||
      !["albumId", "contentVersion", "primaryPid", "primaryName", "title", "coverImage", "file"].every(
        (key) => hasString(album, key),
      ) ||
      !String(album.coverImage).startsWith("/images/memory-albums/") ||
      !String(album.file).startsWith("/data/memory-albums/")
    ) {
      throw new MemoryAlbumDataError("Invalid memory album index entry");
    }
    if (pids.has(String(album.primaryPid)) || albumIds.has(String(album.albumId))) {
      throw new MemoryAlbumDataError("Memory album index contains duplicate bindings");
    }
    pids.add(String(album.primaryPid));
    albumIds.add(String(album.albumId));
  }

  return value as MemoryAlbumIndex;
}

export function resolveMemoryAlbumForPid(
  index: MemoryAlbumIndex,
  pid: string | null,
): MemoryAlbumIndexEntry | null {
  if (!pid) return null;
  return index.albums.find((album) => album.primaryPid === pid) ?? null;
}

export function parseMemoryAlbum(value: unknown): MemoryAlbumData {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "1.0" ||
    !hasString(value, "albumId") ||
    !hasString(value, "contentVersion") ||
    !hasString(value, "title") ||
    !hasString(value, "subtitle") ||
    !hasString(value, "summary") ||
    !hasString(value, "coverImageId") ||
    !isRecord(value.binding) ||
    !hasString(value.binding, "primaryPid") ||
    !Array.isArray(value.binding.related) ||
    !Array.isArray(value.pages) ||
    !Array.isArray(value.timeline) ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.images)
  ) {
    throw new MemoryAlbumDataError("Invalid memory album data");
  }

  assertUniqueIds(value.pages, "Memory album pages");
  assertUniqueIds(value.timeline, "Memory album timeline");
  assertUniqueIds(value.sources, "Memory album sources");
  assertUniqueIds(value.images, "Memory album images");

  const sourceIds = new Set(
    value.sources.map((source) => String((source as Record<string, unknown>).id)),
  );
  const imageIds = new Set(
    value.images.map((image) => String((image as Record<string, unknown>).id)),
  );

  if (!imageIds.has(String(value.coverImageId))) {
    throw new MemoryAlbumDataError("Memory album cover image is missing");
  }

  for (const related of value.binding.related) {
    if (
      !isRecord(related) ||
      !hasString(related, "pid") ||
      !hasString(related, "name") ||
      !hasString(related, "relationship") ||
      related.duplicateAlbum !== false
    ) {
      throw new MemoryAlbumDataError("Invalid related heritage point");
    }
  }

  for (const page of value.pages) {
    if (
      !isRecord(page) ||
      !hasString(page, "title") ||
      !Array.isArray(page.blocks) ||
      typeof page.order !== "number"
    ) {
      throw new MemoryAlbumDataError("Invalid memory album page");
    }
    for (const block of page.blocks) {
      if (
        !isRecord(block) ||
        !["lead", "paragraph", "fact", "note"].includes(String(block.kind)) ||
        !hasString(block, "text")
      ) {
        throw new MemoryAlbumDataError("Invalid memory album content block");
      }
    }
    assertReferences(page.imageIds, imageIds, `Page ${String(page.id)} images`);
    assertReferences(page.sourceIds, sourceIds, `Page ${String(page.id)} sources`);
  }

  for (const event of value.timeline) {
    if (!isRecord(event) || !hasString(event, "title") || !hasString(event, "text")) {
      throw new MemoryAlbumDataError("Invalid memory album timeline event");
    }
    assertReferences(event.sourceIds, sourceIds, `Timeline ${String(event.id)} sources`);
  }

  for (const source of value.sources) {
    if (
      !isRecord(source) ||
      !hasString(source, "title") ||
      !hasString(source, "publisher") ||
      !hasString(source, "url") ||
      !isStringArray(source.authors) ||
      !isStringArray(source.usage) ||
      !hasString(source, "textUseNote")
    ) {
      throw new MemoryAlbumDataError("Invalid memory album source");
    }
  }

  for (const image of value.images) {
    if (
      !isRecord(image) ||
      !hasString(image, "path") ||
      !hasString(image, "alt") ||
      !hasString(image, "creator") ||
      !hasString(image, "sourceUrl") ||
      !hasString(image, "caption") ||
      !hasString(image, "attribution") ||
      !isStringArray(image.changes) ||
      !isRecord(image.source) ||
      !hasString(image.source, "sha256") ||
      typeof image.source.width !== "number" ||
      typeof image.source.height !== "number" ||
      typeof image.source.bytes !== "number"
    ) {
      throw new MemoryAlbumDataError("Invalid memory album image");
    }
  }

  const orders = value.pages.map((page) => Number((page as Record<string, unknown>).order));
  if (new Set(orders).size !== orders.length) {
    throw new MemoryAlbumDataError("Memory album pages contain duplicate order values");
  }

  return value as unknown as MemoryAlbumData;
}