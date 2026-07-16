import type { ConversionOptions } from "@/types/conversion"

export interface ConvertResult {
  buffer: Buffer
  targetMissed: boolean
}

export async function convertToWebP(
  buffer: Buffer,
  mime: string,
  filename: string,
  options: ConversionOptions
): Promise<ConvertResult> {
  // Dynamic import keeps sharp server-only; never bundled client-side
  const sharp = (await import("sharp")).default

  let input = buffer

  // HEIC pre-pass: heic-convert → JPEG buffer, then Sharp handles JPEG
  if (mime === "image/heic" || mime === "image/heif") {
    const heicConvert = (await import("heic-convert")).default
    const jpegBuffer = await heicConvert({
      buffer: input,
      format: "JPEG",
      quality: 0.92,
    })
    input = Buffer.from(jpegBuffer)
  }

  // Target-size mode: binary-search quality to get close to targetSizeKb
  if (options.targetSizeKb && !options.lossless) {
    return binarySearchQuality(input, options.targetSizeKb)
  }

  const pipeline = sharp(input)

  if (!options.keepMetadata) {
    pipeline.withMetadata({})
  } else {
    pipeline.withMetadata()
  }

  const webpOptions: Parameters<typeof pipeline.webp>[0] = {
    quality: options.quality,
    lossless: options.lossless,
  }

  return { buffer: await pipeline.webp(webpOptions).toBuffer(), targetMissed: false }
}

async function binarySearchQuality(input: Buffer, targetSizeKb: number): Promise<ConvertResult> {
  const { default: sharp } = await import("sharp")
  const targetBytes = targetSizeKb * 1024
  let lo = 1
  let hi = 100
  let best: Buffer | undefined

  for (let i = 0; i < 8; i++) {
    const mid = Math.round((lo + hi) / 2)
    const buf = await sharp(input).webp({ quality: mid, lossless: false }).toBuffer()

    if (buf.byteLength <= targetBytes) {
      best = buf
      lo = mid + 1
    } else {
      hi = mid - 1
    }

    if (lo > hi) break
  }

  if (!best) {
    best = await sharp(input).webp({ quality: 1, lossless: false }).toBuffer()
    return { buffer: best, targetMissed: true }
  }

  return { buffer: best, targetMissed: false }
}
