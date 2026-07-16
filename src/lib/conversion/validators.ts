import type { IngestedFile } from "@/types/upload"
import type { ConversionError } from "@/types/conversion"
import { isAccepted, isAlreadyWebP } from "./formats"

export interface ValidationResult {
  valid: boolean
  error?: ConversionError
}

const MAX_SIZE_BYTES = 4 * 1024 * 1024 // 4 MB (Vercel Hobby body limit is 4.5 MB)

export function validateFile(
  file: IngestedFile,
  seenNames: Set<string>
): ValidationResult {
  const { file: f, relativePath } = file

  if (f.size === 0) {
    return { valid: false, error: { code: "EMPTY_FILE", message: "File is empty." } }
  }

  if (f.size > MAX_SIZE_BYTES) {
    return { valid: false, error: { code: "TOO_LARGE", message: `File exceeds 4 MB limit.` } }
  }

  if (isAlreadyWebP(f.name, f.type)) {
    return { valid: false, error: { code: "ALREADY_WEBP", message: "File is already WebP." } }
  }

  if (!isAccepted(f.name, f.type)) {
    return { valid: false, error: { code: "UNSUPPORTED_FORMAT", message: "Unsupported format." } }
  }

  const key = relativePath || f.name
  if (seenNames.has(key)) {
    return { valid: false, error: { code: "DUPLICATE", message: "Duplicate file skipped." } }
  }
  seenNames.add(key)

  return { valid: true }
}
