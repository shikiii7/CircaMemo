import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_IMAGES_PER_CONTENT = 3;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const STORAGE_KEY_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

function resolveUploadRoot(): string {
  const configured = process.env.USER_UPLOAD_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  const cwd = process.cwd();
  const projectRoot =
    path.basename(cwd).toLowerCase() === "frontend" ? path.dirname(cwd) : cwd;
  return path.join(projectRoot, "data", "uploads", "user-content");
}

export function getUploadRoot(): string {
  return resolveUploadRoot();
}

/** 通过文件头判断真实图片类型，不信任浏览器上报的 MIME。 */
export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  return null;
}

export type SavedImage = {
  storageKey: string;
  mimeType: string;
  byteSize: number;
};

/** 校验并写入单张图片，返回可入库的元数据。 */
export async function saveImageFile(file: File): Promise<SavedImage> {
  if (file.size <= 0) {
    throw new Error("图片文件为空");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`单张图片不能超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageMime(buffer);
  if (!mimeType) {
    throw new Error("仅支持 JPG / PNG / WEBP 图片");
  }

  const extension = MIME_EXTENSIONS[mimeType];
  const storageKey = `${randomUUID()}.${extension}`;
  const root = getUploadRoot();
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), buffer, { flag: "wx" });

  return { storageKey, mimeType, byteSize: buffer.byteLength };
}

/** 读取图片二进制；storageKey 非法或文件不存在时返回 null。 */
export async function readImageFile(
  storageKey: string,
): Promise<Buffer | null> {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) return null;
  try {
    return await readFile(path.join(getUploadRoot(), storageKey));
  } catch {
    return null;
  }
}
