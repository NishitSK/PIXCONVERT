import type { ConversionErrorCode } from "./conversion"

export interface ConvertSuccessResponse {
  ok: true
  outputName: string
  originalSize: number
  outputSize: number
  webpBase64: string
  targetMissed?: boolean
}

export interface ConvertErrorResponse {
  ok: false
  errorCode: ConversionErrorCode
  message: string
}

export type ConvertResponse = ConvertSuccessResponse | ConvertErrorResponse

export interface ZipFileEntry {
  relativePath: string
  base64: string
  outputName: string
}

export interface ZipRequest {
  files: ZipFileEntry[]
  zipName?: string
}
