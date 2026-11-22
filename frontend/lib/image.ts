/**
 * Get full image URL for a heritage point cover image.
 *
 * Rules:
 * - Development (NEXT_PUBLIC_IMG_BASE_URL empty):
 *   Use local mock images under /assets/oss_mock/
 * - Production (NEXT_PUBLIC_IMG_BASE_URL set):
 *   Use OSS / CDN custom domain
 * - Missing key → fallback P000_missing.jpg
 */
export function getCoverImageUrl(
  key: string | null | undefined
): string {
  const fallbackKey = "heritage_points/cover_img/shaanxi/xian/P000_missing.jpg";
  const effectiveKey = key || fallbackKey;
  const base = process.env.NEXT_PUBLIC_IMG_BASE_URL || "";

  if (base) {
    return `${base}/${effectiveKey}`;
  }

  return `/assets/oss_mock/${effectiveKey}`;
}
