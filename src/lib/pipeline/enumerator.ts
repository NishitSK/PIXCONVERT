import { v4 as uuidv4 } from "uuid"
import type { IngestedFile, UploadMode } from "@/types/upload"
import type { FileWithPath } from "@/components/upload/UploadDropzone"
import { getExtension, isAccepted } from "@/lib/conversion/formats"

export async function enumerateFiles(
  files: FileWithPath[],
  mode: UploadMode
): Promise<IngestedFile[]> {
  switch (mode) {
    case "zip":
      return enumerateZip(files[0])
    case "folder":
      return enumerateFolder(files)
    default:
      return enumerateFlat(files)
  }
}

function enumerateFlat(files: FileWithPath[]): IngestedFile[] {
  return files.map((file) => ({
    file,
    relativePath: file.name,
    id: uuidv4(),
  }))
}

function enumerateFolder(files: FileWithPath[]): IngestedFile[] {
  return files.map((file) => {
    // Prefer _relativePath (from showDirectoryPicker), fall back to webkitRelativePath, then filename
    const rel =
      file._relativePath ||
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name
    return { file, relativePath: rel, id: uuidv4() }
  })
}

async function enumerateZip(zipFile: FileWithPath): Promise<IngestedFile[]> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(zipFile)
  const results: IngestedFile[] = []

  for (const [relativePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const ext = getExtension(relativePath)
    if (!isAccepted(relativePath)) continue

    const blob = await entry.async("blob")
    const filename = relativePath.split("/").pop() ?? relativePath
    const file = new File([blob], filename, { type: blobTypeFromExt(ext) })
    results.push({ file, relativePath, id: uuidv4() })
  }

  return results
}

function blobTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
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
  }
  return map[ext] ?? "application/octet-stream"
}
