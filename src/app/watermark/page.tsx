"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { formatBytes } from "@/lib/utils/fileUtils"
import { ArrowLeft, Stamp, Download, Loader2, X, Image as ImageIcon, Type, Grid } from "lucide-react"
import Link from "next/link"
import JSZip from "jszip"
import { Navbar } from "@/components/layout/Navbar"

type Position = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" | "tile"

interface WatermarkFile {
  id: string
  file: File
  previewUrl: string
}

export default function WatermarkPage() {
  const [files, setFiles] = useState<WatermarkFile[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Watermark Settings
  const [mode, setMode] = useState<"text" | "logo">("text")
  const [text, setText] = useState("© My Watermark")
  const [fontSize, setFontSize] = useState(36)
  const [textColor, setTextColor] = useState("#ffffff")
  const [opacity, setOpacity] = useState(0.8)
  const [position, setPosition] = useState<Position>("bottom-right")
  const [padding, setPadding] = useState(24)

  // Logo Settings
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [logoScale, setLogoScale] = useState(0.2) // 20% of image size

  const [processing, setProcessing] = useState(false)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleFiles = useCallback((incoming: File[]) => {
    const supported = incoming.filter((f) =>
      /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|avif|svg)$/i.test(f.name)
    )
    const newFiles: WatermarkFile[] = supported.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id)
      if (selectedIdx >= filtered.length) setSelectedIdx(Math.max(0, filtered.length - 1))
      return filtered
    })
  }

  const resetAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setFiles([])
    setLogoFile(null)
    setLogoPreview("")
    setSelectedIdx(0)
  }

  const renderWatermarkOnCanvas = useCallback(
    (canvas: HTMLCanvasElement, img: HTMLImageElement, logoImg?: HTMLImageElement | null): Promise<void> => {
      return new Promise((resolve) => {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext("2d")!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        ctx.globalAlpha = opacity

        if (mode === "text" && text.trim()) {
          ctx.font = `bold ${fontSize}px sans-serif`
          ctx.fillStyle = textColor
          ctx.textBaseline = "middle"

          const metrics = ctx.measureText(text)
          const textWidth = metrics.width
          const textHeight = fontSize

          if (position === "tile") {
            const stepX = textWidth + 100
            const stepY = textHeight + 100
            for (let x = 0; x < canvas.width; x += stepX) {
              for (let y = 0; y < canvas.height; y += stepY) {
                ctx.fillText(text, x, y)
              }
            }
          } else {
            let x = padding
            let y = padding + textHeight / 2

            if (position.includes("center") && !position.includes("top") && !position.includes("bottom")) {
              y = canvas.height / 2
            }
            if (position.includes("bottom")) {
              y = canvas.height - padding - textHeight / 2
            }
            if (position.includes("top")) {
              y = padding + textHeight / 2
            }

            if (position.endsWith("center") || position === "center") {
              x = (canvas.width - textWidth) / 2
            }
            if (position.endsWith("right")) {
              x = canvas.width - padding - textWidth
            }

            // Draw subtle drop shadow for text visibility
            ctx.shadowColor = "rgba(0,0,0,0.5)"
            ctx.shadowBlur = 4
            ctx.fillText(text, x, y)
            ctx.shadowColor = "transparent"
          }
        } else if (mode === "logo" && logoImg) {
          const logoW = canvas.width * logoScale
          const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth)

          if (position === "tile") {
            const stepX = logoW + 80
            const stepY = logoH + 80
            for (let x = 0; x < canvas.width; x += stepX) {
              for (let y = 0; y < canvas.height; y += stepY) {
                ctx.drawImage(logoImg, x, y, logoW, logoH)
              }
            }
          } else {
            let x = padding
            let y = padding

            if (position.includes("center") && !position.includes("top") && !position.includes("bottom")) {
              y = (canvas.height - logoH) / 2
            }
            if (position.includes("bottom")) {
              y = canvas.height - padding - logoH
            }
            if (position.includes("top")) {
              y = padding
            }

            if (position.endsWith("center") || position === "center") {
              x = (canvas.width - logoW) / 2
            }
            if (position.endsWith("right")) {
              x = canvas.width - padding - logoW
            }

            ctx.drawImage(logoImg, x, y, logoW, logoH)
          }
        }

        ctx.globalAlpha = 1.0
        resolve()
      })
    },
    [fontSize, mode, opacity, padding, position, text, textColor, logoScale]
  )

  // Update live preview when settings change
  useEffect(() => {
    if (files.length === 0 || !previewCanvasRef.current) return
    const activeFile = files[selectedIdx]
    if (!activeFile) return

    const img = document.createElement("img")
    img.src = activeFile.previewUrl
    img.onload = async () => {
      let logoImg: HTMLImageElement | null = null
      if (mode === "logo" && logoPreview) {
        logoImg = document.createElement("img")
        logoImg.src = logoPreview
        await new Promise((res) => { logoImg!.onload = res })
      }
      if (previewCanvasRef.current) {
        await renderWatermarkOnCanvas(previewCanvasRef.current, img, logoImg)
      }
    }
  }, [files, selectedIdx, mode, text, fontSize, textColor, opacity, position, padding, logoPreview, logoScale, renderWatermarkOnCanvas])

  const downloadAll = async () => {
    if (files.length === 0) return
    setProcessing(true)
    const zip = new JSZip()

    let logoImg: HTMLImageElement | null = null
    if (mode === "logo" && logoPreview) {
      logoImg = document.createElement("img")
      logoImg.src = logoPreview
      await new Promise((res) => { logoImg!.onload = res })
    }

    for (const item of files) {
      const img = document.createElement("img")
      img.src = item.previewUrl
      await new Promise((res) => { img.onload = res })

      const canvas = document.createElement("canvas")
      await renderWatermarkOnCanvas(canvas, img, logoImg)

      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92))
      const ext = item.file.name.substring(item.file.name.lastIndexOf("."))
      const name = `${item.file.name.substring(0, item.file.name.lastIndexOf("."))}_watermarked${ext || ".jpg"}`
      zip.file(name, blob)
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = "watermarked_images.zip"
    a.click()
    URL.revokeObjectURL(url)
    setProcessing(false)
  }

  const positions: { key: Position; label: string }[] = [
    { key: "top-left", label: "TL" },
    { key: "top-center", label: "TC" },
    { key: "top-right", label: "TR" },
    { key: "center-left", label: "CL" },
    { key: "center", label: "C" },
    { key: "center-right", label: "CR" },
    { key: "bottom-left", label: "BL" },
    { key: "bottom-center", label: "BC" },
    { key: "bottom-right", label: "BR" },
  ]

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to WebP Converter
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Batch Image Watermarker
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Overlay custom text or logo watermarks across multiple images with 9-point grid alignment or tile grid.
          </p>
        </div>

        {files.length === 0 ? (
          <UploadDropzone onFiles={handleFiles} multiple />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left Column: Canvas Preview + File Queue Thumbnails */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 flex items-center justify-center p-2 min-h-[340px]">
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[460px] w-auto rounded object-contain"
                />
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {files.map((f, i) => (
                  <div key={f.id} className="relative shrink-0 group">
                    <button
                      onClick={() => setSelectedIdx(i)}
                      className={`h-14 w-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedIdx === i ? "border-neutral-900 dark:border-neutral-100" : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Controls Panel */}
            <div className="space-y-5 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-neutral-500" />
                  Watermark Settings
                </h3>
                <button
                  onClick={resetAll}
                  className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  Clear all
                </button>
              </div>

              {/* Mode Toggle: Text vs Logo */}
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 p-1 bg-white dark:bg-neutral-950">
                <button
                  onClick={() => setMode("text")}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    mode === "text"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  <Type className="h-3.5 w-3.5" />
                  Text
                </button>
                <button
                  onClick={() => setMode("logo")}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    mode === "logo"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Logo Image
                </button>
              </div>

              {mode === "text" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Watermark Text</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Font Size ({fontSize}px)</label>
                      <input
                        type="range"
                        min={12}
                        max={120}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-neutral-900 dark:accent-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Color</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-7 w-full cursor-pointer rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-0.5"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Upload Logo (PNG/WebP)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-xs text-neutral-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-neutral-200 dark:file:bg-neutral-800 file:text-neutral-800 dark:file:text-neutral-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Logo Size ({Math.round(logoScale * 100)}%)</label>
                    <input
                      type="range"
                      min={0.05}
                      max={0.8}
                      step={0.05}
                      value={logoScale}
                      onChange={(e) => setLogoScale(Number(e.target.value))}
                      className="w-full accent-neutral-900 dark:accent-neutral-100"
                    />
                  </div>
                </div>
              )}

              {/* Opacity Slider */}
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Opacity ({Math.round(opacity * 100)}%)</label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-neutral-100"
                />
              </div>

              {/* Positioning 9-Grid & Tile */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 block">Position Alignment</label>
                <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto">
                  {positions.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPosition(p.key)}
                      className={`h-9 rounded-md text-xs font-mono font-medium transition-colors border ${
                        position === p.key
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                          : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPosition("tile")}
                  className={`w-full mt-2 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center justify-center gap-1.5 ${
                    position === "tile"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                      : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <Grid className="h-3.5 w-3.5" />
                  Tile Grid Across Image
                </button>
              </div>

              {/* Download Action */}
              <button
                onClick={downloadAll}
                disabled={processing}
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Watermarking {files.length} images…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Watermarked ({files.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-16 border-t border-neutral-100 dark:border-neutral-900 pt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Custom",
                body: "Overlay custom text or logo image watermarks with font size, opacity, and color controls.",
              },
              {
                title: "Flexible",
                body: "Position watermarks using a 9-point grid alignment or full tile pattern across photos.",
              },
              {
                title: "Secure",
                body: "Batch process hundreds of photos locally in your browser and download as a ZIP archive.",
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
