"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { formatBytes } from "@/lib/utils/fileUtils"
import { ArrowLeft, Pipette, Palette, Copy, Check, Download } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"

interface ColorSwatch {
  hex: string
  rgb: string
  hsl: string
  r: number
  g: number
  b: number
  percentage: number
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
}

function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

// Simple color quantization algorithm for extracting dominant swatches
function extractDominantColors(canvas: HTMLCanvasElement, numColors = 8): ColorSwatch[] {
  const ctx = canvas.getContext("2d")
  if (!ctx) return []

  const sampleSize = 150
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = sampleSize
  tempCanvas.height = sampleSize
  const tempCtx = tempCanvas.getContext("2d")!
  tempCtx.drawImage(canvas, 0, 0, sampleSize, sampleSize)

  const imageData = tempCtx.getImageData(0, 0, sampleSize, sampleSize).data
  const colorBuckets = new Map<string, { r: number; g: number; b: number; count: number }>()

  // Quantize RGB values into 32-level bins
  for (let i = 0; i < imageData.length; i += 4) {
    const a = imageData[i + 3]
    if (a < 128) continue // Ignore transparent pixels

    const r = Math.round(imageData[i] / 24) * 24
    const g = Math.round(imageData[i + 1] / 24) * 24
    const b = Math.round(imageData[i + 2] / 24) * 24
    const key = `${r},${g},${b}`

    const existing = colorBuckets.get(key)
    if (existing) {
      existing.count++
      existing.r += imageData[i]
      existing.g += imageData[i + 1]
      existing.b += imageData[i + 2]
    } else {
      colorBuckets.set(key, { r: imageData[i], g: imageData[i + 1], b: imageData[i + 2], count: 1 })
    }
  }

  const sorted = Array.from(colorBuckets.values()).sort((a, b) => b.count - a.count)
  const totalPixels = sorted.reduce((sum, item) => sum + item.count, 0) || 1

  return sorted.slice(0, numColors).map((item) => {
    const avgR = Math.round(item.r / item.count)
    const avgG = Math.round(item.g / item.count)
    const avgB = Math.round(item.b / item.count)
    return {
      hex: rgbToHex(avgR, avgG, avgB),
      rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
      hsl: rgbToHsl(avgR, avgG, avgB),
      r: avgR,
      g: avgG,
      b: avgB,
      percentage: Math.round((item.count / totalPixels) * 100),
    }
  })
}

export default function PalettePage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [swatches, setSwatches] = useState<ColorSwatch[]>([])
  const [pickedColor, setPickedColor] = useState<ColorSwatch | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loupe, setLoupe] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })

  const handleFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return
    const selected = incoming[0]
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setPickedColor(null)
  }, [])

  useEffect(() => {
    if (!previewUrl || !canvasRef.current) return
    const img = document.createElement("img")
    img.src = previewUrl
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      const extracted = extractDominantColors(canvas, 8)
      setSwatches(extracted)
      if (extracted.length > 0) setPickedColor(extracted[0])
    }
  }, [previewUrl])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    setLoupe({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const r = pixel[0], g = pixel[1], b = pixel[2]
    setPickedColor({
      hex: rgbToHex(r, g, b),
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: rgbToHsl(r, g, b),
      r, g, b,
      percentage: 0,
    })
  }

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl("")
    setSwatches([])
    setPickedColor(null)
  }

  const exportCss = () => {
    const css = swatches.map((s, i) => `  --color-${i + 1}: ${s.hex};`).join("\n")
    copyToClipboard(`:root {\n${css}\n}`, "css")
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to WebP Converter
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Color Palette Extractor & Color Picker
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Extract dominant swatches from any image or hover/click to inspect exact pixel colors.
          </p>
        </div>

        {!file ? (
          <UploadDropzone onFiles={handleFiles} multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <Pipette className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {file.name} ({formatBytes(file.size)})
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportCss}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                >
                  {copiedKey === "css" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy CSS Variables
                </button>
                <button
                  onClick={reset}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Change file
                </button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-[1fr_320px]">
              {/* Left Column: Interactive Image Canvas */}
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 flex items-center justify-center p-2">
                  <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setLoupe((prev) => ({ ...prev, visible: false }))}
                    className="max-h-[420px] w-auto cursor-crosshair rounded object-contain"
                  />

                  {loupe.visible && pickedColor && (
                    <div
                      className="pointer-events-none absolute h-12 w-12 rounded-full border-2 border-white shadow-lg flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: loupe.x,
                        top: loupe.y,
                        backgroundColor: pickedColor.hex,
                      }}
                    />
                  )}
                </div>

                <p className="text-xs text-center text-neutral-400">
                  Hover or click anywhere on the image to inspect exact pixel colors.
                </p>
              </div>

              {/* Right Column: Picked Color & Palette Swatches */}
              <div className="space-y-5">
                {/* Picked Color Card */}
                {pickedColor && (
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg shadow-inner border border-black/10 dark:border-white/10 shrink-0"
                        style={{ backgroundColor: pickedColor.hex }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Sampled Color</p>
                        <p className="text-base font-mono font-bold text-neutral-900 dark:text-neutral-100">{pickedColor.hex}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">HEX</span>
                        <button
                          onClick={() => copyToClipboard(pickedColor.hex, "sampled-hex")}
                          className="font-mono text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
                        >
                          {copiedKey === "sampled-hex" ? <Check className="h-3 w-3 text-emerald-500" /> : null}
                          {pickedColor.hex}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">RGB</span>
                        <button
                          onClick={() => copyToClipboard(pickedColor.rgb, "sampled-rgb")}
                          className="font-mono text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
                        >
                          {copiedKey === "sampled-rgb" ? <Check className="h-3 w-3 text-emerald-500" /> : null}
                          {pickedColor.rgb}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">HSL</span>
                        <button
                          onClick={() => copyToClipboard(pickedColor.hsl, "sampled-hsl")}
                          className="font-mono text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
                        >
                          {copiedKey === "sampled-hsl" ? <Check className="h-3 w-3 text-emerald-500" /> : null}
                          {pickedColor.hsl}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extracted Swatches */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    <Palette className="h-4 w-4 text-neutral-500" />
                    Dominant Palette ({swatches.length})
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {swatches.map((swatch, idx) => (
                      <button
                        key={idx}
                        onClick={() => copyToClipboard(swatch.hex, `swatch-${idx}`)}
                        className="group flex items-center gap-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 p-2 text-left hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                      >
                        <div
                          className="h-7 w-7 rounded-md shrink-0 border border-black/10 dark:border-white/10 shadow-sm"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs font-medium text-neutral-800 dark:text-neutral-200 group-hover:underline truncate">
                            {swatch.hex}
                          </p>
                          <p className="text-[10px] text-neutral-400">{swatch.percentage}%</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 border-t border-neutral-100 dark:border-neutral-900 pt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Precise",
                body: "Hover or click anywhere on your photo to sample exact pixel colors with a magnifier loupe.",
              },
              {
                title: "Simple",
                body: "Automatically extract top 8 dominant swatches with percentage coverage breakdowns.",
              },
              {
                title: "Secure",
                body: "Export HEX, RGB, HSL, or CSS variables instantly without sending your images to cloud servers.",
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
