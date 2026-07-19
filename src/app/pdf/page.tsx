"use client"

import { useState, useCallback, useRef } from "react"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { formatBytes } from "@/lib/utils/fileUtils"
import { FileText, X, Download, Loader2, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"

interface PDFFile {
  id: string
  file: File
  preview?: string
}

type PageSize = "fit" | "a4" | "letter"

export default function PDFPage() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [pageSize, setPageSize] = useState<PageSize>("fit")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [error, setError] = useState("")
  const previewUrlsRef = useRef<Map<string, string>>(new Map())

  const handleFiles = useCallback((incoming: File[]) => {
    const supported = incoming.filter((f) =>
      /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|avif|svg)$/i.test(f.name)
    )
    const newEntries: PDFFile[] = supported.map((f) => {
      const id = `${f.name}-${f.size}-${f.lastModified}`
      if (!previewUrlsRef.current.has(id)) {
        previewUrlsRef.current.set(id, URL.createObjectURL(f))
      }
      return { id, file: f, preview: previewUrlsRef.current.get(id) }
    })
    setFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id))
      return [...prev, ...newEntries.filter((e) => !existingIds.has(e.id))]
    })
  }, [])

  const remove = (id: string) => {
    const url = previewUrlsRef.current.get(id)
    if (url) URL.revokeObjectURL(url)
    previewUrlsRef.current.delete(id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const move = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const reset = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current.clear()
    setFiles([])
    setStatus("idle")
    setError("")
  }

  const fileToJpeg = (file: File): Promise<{ dataUrl: string; w: number; h: number }> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img")
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const c = document.createElement("canvas")
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext("2d")!
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        resolve({ dataUrl: c.toDataURL("image/jpeg", 0.92), w: img.naturalWidth, h: img.naturalHeight })
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)) }
      img.src = url
    })

  const convert = async () => {
    if (!files.length) return
    setStatus("loading")
    setError("")
    try {
      const { PDFDocument } = await import("pdf-lib")
      const pdf = await PDFDocument.create()

      for (const pdfFile of files) {
        const { dataUrl, w: imgW, h: imgH } = await fileToJpeg(pdfFile.file)
        const jpegBytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0))
        const jpgImage = await pdf.embedJpg(jpegBytes)

        let pageW: number, pageH: number
        if (pageSize === "a4") { pageW = 595.28; pageH = 841.89 }
        else if (pageSize === "letter") { pageW = 612; pageH = 792 }
        else { pageW = imgW; pageH = imgH }

        const scale = Math.min(pageW / imgW, pageH / imgH)
        const drawW = imgW * scale
        const drawH = imgH * scale
        const page = pdf.addPage([pageW, pageH])
        page.drawImage(jpgImage, { x: (pageW - drawW) / 2, y: (pageH - drawH) / 2, width: drawW, height: drawH })
      }

      const pdfBytes = await pdf.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "converted.pdf"
      a.click()
      URL.revokeObjectURL(url)
      setStatus("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setStatus("error")
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to WebP Converter
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Images to PDF
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Combine multiple images into a single PDF. Runs entirely in your browser — nothing uploaded.
          </p>
        </div>

        <UploadDropzone onFiles={handleFiles} multiple />

        {files.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {files.length} image{files.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={reset}
                  className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  Clear all
                </button>
              </div>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {files.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                    {f.preview && (
                      <img
                        src={f.preview}
                        alt=""
                        className="h-10 w-10 rounded object-cover shrink-0 border border-neutral-100 dark:border-neutral-800"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                        {f.file.name}
                      </p>
                      <p className="text-xs text-neutral-400">{formatBytes(f.file.size)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === files.length - 1}
                        className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(f.id)}
                        className="rounded p-1 text-neutral-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Page size
                </span>
                <div className="flex gap-1">
                  {(["fit", "a4", "letter"] as PageSize[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPageSize(s)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        pageSize === s
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {s === "fit" ? "Fit image" : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={convert}
              disabled={status === "loading"}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Convert to PDF
                </>
              )}
            </button>

            {status === "done" && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center gap-2">
                <Download className="h-4 w-4 shrink-0" />
                PDF downloaded successfully.
              </div>
            )}

            {status === "error" && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-16 border-t border-neutral-100 dark:border-neutral-900 pt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Flexible",
                body: "Choose from Fit, A4, or Letter page formats with automatic scaling.",
              },
              {
                title: "Simple",
                body: "Drag & drop multiple images, reorder with arrow controls, and compile with one click.",
              },
              {
                title: "Secure",
                body: "All PDF creation runs client-side using pdf-lib — no server uploads.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-neutral-100 p-5 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/30"
              >
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
