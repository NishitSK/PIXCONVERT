export const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/bmp",
  "image/tiff",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
])

export const ACCEPTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".bmp",
  ".tiff",
  ".tif",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  ".svg",
])

export const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".")
  return idx === -1 ? "" : filename.slice(idx).toLowerCase()
}

export function isHeic(filename: string): boolean {
  const ext = getExtension(filename)
  return ext === ".heic" || ext === ".heif"
}

export function isSvg(filename: string, mime?: string): boolean {
  return mime === "image/svg+xml" || getExtension(filename) === ".svg"
}

export function isAlreadyWebP(filename: string, mime?: string): boolean {
  return mime === "image/webp" || getExtension(filename) === ".webp"
}

export function isAccepted(filename: string, mime?: string): boolean {
  const ext = getExtension(filename)
  if (ACCEPTED_EXTENSIONS.has(ext)) return true
  if (mime && ACCEPTED_MIMES.has(mime)) return true
  return false
}
