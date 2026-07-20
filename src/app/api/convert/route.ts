import { NextRequest, NextResponse } from "next/server"
import { convertToWebP } from "@/lib/conversion/converter"
import { isHeic, isAlreadyWebP, isAccepted, getExtension } from "@/lib/conversion/formats"
import { toWebPName } from "@/lib/utils/fileUtils"
import type { ConvertResponse } from "@/types/api"
import type { ConversionOptions } from "@/types/conversion"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB (HEIC from iPhones can be 5–10 MB)

export async function POST(req: NextRequest): Promise<NextResponse<ConvertResponse>> {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const optionsRaw = formData.get("options") as string | null

    if (!file) {
      return NextResponse.json(
        { ok: false, errorCode: "CONVERSION_FAILED", message: "No file provided." },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { ok: false, errorCode: "EMPTY_FILE", message: "File is empty." },
        { status: 422 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, errorCode: "TOO_LARGE", message: "File exceeds 50 MB limit." },
        { status: 413 }
      )
    }

    if (isAlreadyWebP(file.name, file.type)) {
      return NextResponse.json(
        { ok: false, errorCode: "ALREADY_WEBP", message: "File is already WebP." },
        { status: 422 }
      )
    }

    if (!isAccepted(file.name, file.type)) {
      return NextResponse.json(
        { ok: false, errorCode: "UNSUPPORTED_FORMAT", message: "Unsupported file format." },
        { status: 422 }
      )
    }

    const options: ConversionOptions = optionsRaw
      ? JSON.parse(optionsRaw)
      : { quality: 80, lossless: false, keepMetadata: false }

    const mime = file.type || `image/${getExtension(file.name).slice(1)}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let result: Awaited<ReturnType<typeof convertToWebP>>
    try {
      result = await convertToWebP(buffer, mime, file.name, options)
    } catch {
      return NextResponse.json(
        { ok: false, errorCode: "CONVERSION_FAILED", message: "Conversion failed." },
        { status: 500 }
      )
    }

    const { buffer: webpBuffer, targetMissed } = result
    const webpBase64 = webpBuffer.toString("base64")
    const outputName = toWebPName(file.name)

    return NextResponse.json({
      ok: true,
      outputName,
      originalSize: file.size,
      outputSize: webpBuffer.byteLength,
      webpBase64,
      targetMissed,
    })
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "CONVERSION_FAILED", message: "Internal server error." },
      { status: 500 }
    )
  }
}
