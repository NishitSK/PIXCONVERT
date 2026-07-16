import type { ConversionErrorCode } from "@/types/conversion"

const MESSAGES: Record<ConversionErrorCode, string> = {
  UNSUPPORTED_FORMAT: "File format not supported. Accepted: JPG, PNG, BMP, TIFF, GIF, HEIC, AVIF, SVG.",
  CORRUPTED: "File appears to be corrupted or unreadable.",
  CONVERSION_FAILED: "Conversion failed. The image may be malformed.",
  ALREADY_WEBP: "File is already in WebP format.",
  TOO_LARGE: "File exceeds the maximum allowed size.",
  DUPLICATE: "Duplicate file detected and skipped.",
  EMPTY_FILE: "File is empty.",
}

export function getErrorMessage(code: ConversionErrorCode): string {
  return MESSAGES[code] ?? "An unknown error occurred."
}
