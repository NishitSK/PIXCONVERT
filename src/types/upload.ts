export type UploadMode = "single" | "multiple" | "folder" | "zip"

export interface IngestedFile {
  file: File
  relativePath: string
  id: string
}

export interface UploadSource {
  mode: UploadMode
  rawFiles: File[]
}
