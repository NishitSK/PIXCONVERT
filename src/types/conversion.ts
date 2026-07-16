export interface ConversionOptions {
  quality: number
  lossless: boolean
  keepMetadata: boolean
  targetSizeKb: number | null
}

export type JobStatus = "pending" | "running" | "completed" | "failed"

export type ConversionErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "CORRUPTED"
  | "CONVERSION_FAILED"
  | "ALREADY_WEBP"
  | "TOO_LARGE"
  | "DUPLICATE"
  | "EMPTY_FILE"

export interface ConversionError {
  code: ConversionErrorCode
  message: string
}

export interface ConversionResult {
  jobId: string
  outputName: string
  relativePath: string
  webpBase64: string
  originalSize: number
  outputSize: number
  targetMissed?: boolean
}

export interface ConversionJob {
  id: string
  filename: string
  relativePath: string
  options: ConversionOptions
  status: JobStatus
  error?: ConversionError
  result?: ConversionResult
  startedAt?: number
  completedAt?: number
}
