import { NextRequest, NextResponse } from "next/server"
import { packageToZip } from "@/lib/pipeline/packager"
import type { ZipRequest } from "@/types/api"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body: ZipRequest = await req.json()

    if (!body.files || body.files.length === 0) {
      return NextResponse.json(
        { ok: false, errorCode: "EMPTY_PAYLOAD", message: "No files provided." },
        { status: 400 }
      )
    }

    const zipBuffer = await packageToZip(body.files, body.zipName ?? "converted.zip")
    const zipName = body.zipName ?? "converted.zip"

    return new NextResponse(zipBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    })
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "CONVERSION_FAILED", message: "Failed to create ZIP." },
      { status: 500 }
    )
  }
}
