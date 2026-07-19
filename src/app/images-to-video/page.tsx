"use client"

import { useState, useRef, useCallback } from "react"
import { Film, Download, X, Loader2, ArrowUpDown } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"

interface ImageItem {
  id: string
  file: File
  previewUrl: string
}

const RESOLUTION_OPTIONS = [
  { label: "From images", value: "auto" },
  { label: "1920×1080 (FHD)", w: 1920, h: 1080 },
  { label: "1280×720 (HD)", w: 1280, h: 720 },
  { label: "854×480 (480p)", w: 854, h: 480 },
  { label: "640×360", w: 640, h: 360 },
]

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export default function ImagesToVideoPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [fps, setFps] = useState(1)
  const [resolutionIdx, setResolutionIdx] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragOverRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const addImageFiles = (files: File[]) => {
    const entries: ImageItem[] = files.map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))
    setImages((prev) => [...prev, ...entries])
  }

  const addFiles = useCallback(async (files: File[]) => {
    const imgs: File[] = []
    const zips: File[] = []
    for (const f of files) {
      if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$/i.test(f.name)) {
        imgs.push(f)
      } else if (f.type === "application/zip" || f.name.endsWith(".zip")) {
        zips.push(f)
      }
    }

    if (imgs.length) addImageFiles(imgs)

    for (const zip of zips) {
      try {
        const JSZip = (await import("jszip")).default
        const loaded = await JSZip.loadAsync(await zip.arrayBuffer())
        const imageEntries: File[] = []
        const sortedNames = Object.keys(loaded.files).sort()
        for (const name of sortedNames) {
          const entry = loaded.files[name]
          if (entry.dir) continue
          if (!/\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$/i.test(name)) continue
          const blob = await entry.async("blob")
          const ext = name.split(".").pop()!.toLowerCase()
          const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
            : ext === "png" ? "image/png"
            : ext === "webp" ? "image/webp"
            : ext === "gif" ? "image/gif"
            : "image/png"
          imageEntries.push(new File([blob], name.split("/").pop()!, { type: mime }))
        }
        addImageFiles(imageEntries)
      } catch {
        // skip bad zip
      }
    }
  }, [])

  const remove = (id: string) => {
    setImages((prev) => {
      const item = prev.find((x) => x.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((x) => x.id !== id)
    })
  }

  const move = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const reset = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl))
    setImages([])
    setStatus("idle")
    setProgress(0)
    setError("")
  }

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img")
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  const generate = async () => {
    if (images.length === 0) return
    setStatus("loading")
    setProgress(0)
    setError("")

    try {
      // Determine resolution
      const resOpt = RESOLUTION_OPTIONS[resolutionIdx]
      let canvasW: number, canvasH: number

      if (resOpt.value === "auto") {
        const first = await loadImage(images[0].previewUrl)
        canvasW = first.naturalWidth
        canvasH = first.naturalHeight
      } else {
        canvasW = resOpt.w!
        canvasH = resOpt.h!
      }

      const canvas = document.createElement("canvas")
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext("2d")!

      // Pick best supported codec
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
        (m) => MediaRecorder.isTypeSupported(m)
      ) ?? "video/webm"

      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      const stopped = new Promise<void>((r) => { recorder.onstop = () => r() })
      recorder.start(100)

      for (let i = 0; i < images.length; i++) {
        const img = await loadImage(images[i].previewUrl)
        const scale = Math.min(canvasW / img.naturalWidth, canvasH / img.naturalHeight)
        const drawW = img.naturalWidth * scale
        const drawH = img.naturalHeight * scale

        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, canvasW, canvasH)
        ctx.drawImage(img, (canvasW - drawW) / 2, (canvasH - drawH) / 2, drawW, drawH)

        setProgress(Math.round(((i + 1) / images.length) * 100))
        await sleep((1 / fps) * 1000)
      }

      recorder.stop()
      await stopped

      const blob = new Blob(chunks, { type: "video/webm" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "images_to_video.webm"
      a.click()
      URL.revokeObjectURL(url)
      setStatus("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video generation failed.")
      setStatus("error")
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Images to Video</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Combine images into a WebM video. Runs entirely in your browser — nothing uploaded.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false)
            addFiles(Array.from(e.dataTransfer.files))
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:py-12 ${
            isDragging
              ? "border-neutral-400 bg-neutral-50 dark:border-neutral-500 dark:bg-neutral-900"
              : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Film className="h-5 w-5 text-neutral-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Drop images here, or click to browse</p>
            <p className="mt-1 text-xs text-neutral-500">JPG, PNG, WebP · or drop a ZIP of images · order them below before generating</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.zip"
            multiple
            className="sr-only"
            onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = "" }}
          />
        </div>

        {images.length > 0 && (
          <div className="mt-4 space-y-4">
            {/* Settings */}
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Frames per second</span>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  {[1, 2, 5, 10, 15, 24, 30].map((f) => (
                    <option key={f} value={f}>{f} fps</option>
                  ))}
                </select>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Resolution</span>
                <select
                  value={resolutionIdx}
                  onChange={(e) => setResolutionIdx(Number(e.target.value))}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  {RESOLUTION_OPTIONS.map((o, i) => (
                    <option key={i} value={i}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={status === "loading" || images.length === 0}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating… {progress}%
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Generate video ({images.length} frame{images.length !== 1 ? "s" : ""})
                </>
              )}
            </button>

            {status === "loading" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}

            {status === "done" && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center gap-2">
                <Download className="h-4 w-4 shrink-0" />
                Video downloaded — open in any browser or media player.
              </div>
            )}

            {status === "error" && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">{error}</p>
            )}

            {/* Image list */}
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {images.length} image{images.length !== 1 ? "s" : ""}
                </span>
                <button onClick={reset} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                  Clear all
                </button>
              </div>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {images.map((item, i) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <img src={item.previewUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0 border border-neutral-100 dark:border-neutral-800" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">{item.file.name}</p>
                      <p className="text-xs text-neutral-400">Frame {i + 1}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30">
                        <ArrowUpDown className="h-3.5 w-3.5 rotate-0" />
                      </button>
                      <button onClick={() => remove(item.id)} className="rounded p-1 text-neutral-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-xs text-neutral-400">
              Output is WebM — supported by all modern browsers. Generation happens in real-time (1× speed).
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
