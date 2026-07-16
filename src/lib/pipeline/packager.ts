import type { ZipFileEntry } from "@/types/api"

export async function packageToZip(
  files: ZipFileEntry[],
  zipName = "converted.zip"
): Promise<Buffer> {
  const JSZip = (await import("jszip")).default
  const zip = new JSZip()

  for (const { relativePath, base64 } of files) {
    zip.file(relativePath, base64, { base64: true })
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })
}
