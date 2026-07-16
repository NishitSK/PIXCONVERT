import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const pageSizeRaw = (formData.get("pageSize") as string) ?? "fit"

    if (!files.length) {
      return NextResponse.json({ ok: false, message: "No files provided." }, { status: 400 })
    }

    const sharp = (await import("sharp")).default
    const pdf = await PDFDocument.create()

    for (const file of files) {
      if (file.size > MAX_SIZE) continue

      const ab = await file.arrayBuffer()
      const buf = Buffer.from(ab)

      // Normalize everything to JPEG via Sharp before embedding
      const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer()
      const meta = await sharp(jpegBuf).metadata()
      const imgWidth = meta.width ?? 800
      const imgHeight = meta.height ?? 600

      const jpgImage = await pdf.embedJpg(jpegBuf)

      let pageW: number, pageH: number
      if (pageSizeRaw === "a4") {
        pageW = 595.28; pageH = 841.89
      } else if (pageSizeRaw === "letter") {
        pageW = 612; pageH = 792
      } else {
        // fit: page = image dimensions (in pts, 72dpi assumption)
        pageW = imgWidth; pageH = imgHeight
      }

      const page = pdf.addPage([pageW, pageH])

      // Scale image to fit inside the page
      const scale = Math.min(pageW / imgWidth, pageH / imgHeight)
      const drawW = imgWidth * scale
      const drawH = imgHeight * scale
      const x = (pageW - drawW) / 2
      const y = (pageH - drawH) / 2

      page.drawImage(jpgImage, { x, y, width: drawW, height: drawH })
    }

    const pdfBytes = await pdf.save()

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="converted.pdf"',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, message: "PDF generation failed." }, { status: 500 })
  }
}
