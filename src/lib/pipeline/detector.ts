import type { UploadMode } from "@/types/upload"
import type { FileWithPath } from "@/components/upload/UploadDropzone"
import { getExtension } from "@/lib/conversion/formats"

export function detectUploadMode(files: FileWithPath[]): UploadMode {
  if (files.length === 0) return "single"

  if (files.length === 1 && getExtension(files[0].name) === ".zip") {
    return "zip"
  }

  // Folder uploads: either _relativePath (showDirectoryPicker) or webkitRelativePath (input fallback)
  if (
    files.some(
      (f) =>
        f._relativePath ||
        (f as File & { webkitRelativePath?: string }).webkitRelativePath
    )
  ) {
    return "folder"
  }

  if (files.length > 1) return "multiple"

  return "single"
}
