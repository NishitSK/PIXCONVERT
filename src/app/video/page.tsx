"use client"

import { useState, useRef, useCallback } from "react"
import { Film, Download, X, Loader2, ArrowLeft, Image } from "lucide-react"
import Link from "next/link"
import JSZip from "jszip"

type OutputFormat = "webp" | "png"

interface Frame {
  index: number
  timeS: number
  dataUrl: string
}

const SIZE_OPTIONS = [
  { label: "Original", scale: 1 },
  { label: "1920px (FHD)", maxW: 1920 },
  { label: "1280px (HD)", maxW: 1280 },
  { label: "854px (480p)", maxW: 854 },
  { label: "640px", maxW: 640 },
  { label: "320px", maxW: 320 },
]

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(1).padStart(4, "0")
  return `${m}:${sec}`
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export default function VideoPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const [format, setFormat] = useState<OutputFormat>("webp")
  const [fps, setFps] = useState(5)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [sizeIndex, setSizeIndex] = useState(0)
  const [quality, setQuality] = useState(90)
  const [skipPreview, setSkipPreview] = useState(false)
  const [removeBg, setRemoveBg] = useState(false)
  const [bgProgress, setBgProgress] = useState("")

  const [frames, setFrames] = useState<Frame[]>([])
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [isZipping, setIsZipping] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadVideo = useCallback((file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoUrl(url)
    setFrames([])
    setStatus("idle")
    setProgress(0)
    setStartTime(0)
    setEndTime(0)
  }, [videoUrl])

  const handleVideoLoaded = () => {
    const v = videoRef.current
    if (!v) return
    setVideoDuration(v.duration)
    setEndTime(parseFloat(v.duration.toFixed(1)))
  }

  const useCurrentPos = (setter: (t: number) => void) => {
    const t = videoRef.current?.currentTime ?? 0
    setter(parseFloat(t.toFixed(1)))
  }

  const captureFrame = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    timeS: number,
    fmt: OutputFormat,
    q: number,
    sizeOpt: typeof SIZE_OPTIONS[number]
  ): Promise<string> => {
    return new Promise((resolve) => {
      video.currentTime = timeS
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked)
        let w = video.videoWidth
        let h = video.videoHeight
        if ("maxW" in sizeOpt && sizeOpt.maxW && w > sizeOpt.maxW) {
          h = Math.round((h * sizeOpt.maxW) / w)
          w = sizeOpt.maxW
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(video, 0, 0, w, h)
        const mime = fmt === "webp" ? "image/webp" : "image/png"
        resolve(canvas.toDataURL(mime, q / 100))
      }
      video.addEventListener("seeked", onSeeked)
    })
  }

  const extract = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !videoDuration) return

    const start = clamp(startTime, 0, videoDuration)
    const end = clamp(endTime, start, videoDuration)
    const duration = end - start
    const interval = 1 / fps
    const sizeOpt = SIZE_OPTIONS[sizeIndex]

    const timestamps: number[] = []
    for (let t = start; t < end + 0.001; t += interval) {
      timestamps.push(parseFloat(Math.min(t, end).toFixed(3)))
      if (timestamps.length > 2000) break // safety cap
    }

    setStatus("extracting")
    setFrames([])
    setProgress(0)

    const extracted: Frame[] = []

    let bgRemover: ((blob: Blob) => Promise<Blob>) | null = null
    if (removeBg) {
      setBgProgress("Loading AI model…")
      const { removeBackground } = await import("@imgly/background-removal")
      bgRemover = (blob: Blob) =>
        removeBackground(blob, {
          device: "webgpu",
          output: { format: format === "webp" ? "image/webp" : "image/png", quality: quality / 100 },
        })
      setBgProgress("")
    }

    for (let i = 0; i < timestamps.length; i++) {
      try {
        let dataUrl = await captureFrame(video, canvas, timestamps[i], format, quality, sizeOpt)

        if (bgRemover) {
          setBgProgress(`Removing bg ${i + 1}/${timestamps.length}…`)
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const resultBlob = await bgRemover(blob)
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(resultBlob)
          })
        }

        extracted.push({ index: i + 1, timeS: timestamps[i], dataUrl })
        if (!skipPreview) setFrames([...extracted])
        setProgress(Math.round(((i + 1) / timestamps.length) * 100))
      } catch {
        // skip bad frame
      }
    }

    setBgProgress("")
    setFrames(extracted)
    setStatus("done")

    if (skipPreview && extracted.length > 0) {
      try { await doZip(extracted) } catch { /* ignore, user can still click download */ }
    }
  }, [videoDuration, startTime, endTime, fps, format, quality, sizeIndex, skipPreview])

  const doZip = async (framesToZip: Frame[]) => {
    setIsZipping(true)
    const zip = new JSZip()
    const ext = format === "webp" ? "webp" : "png"
    for (const frame of framesToZip) {
      const base64 = frame.dataUrl.split(",")[1]
      const ts = frame.timeS.toFixed(1).replace(".", "_")
      zip.file(`frame_${String(frame.index).padStart(4, "0")}_${ts}s.${ext}`, base64, { base64: true })
    }
    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `frames_${videoFile?.name.replace(/\.[^.]+$/, "") ?? "video"}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setIsZipping(false)
  }

  const downloadAll = useCallback(() => doZip(frames), [frames, format, videoFile])

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setVideoDuration(0)
    setFrames([])
    setStatus("idle")
    setProgress(0)
  }

  const estimatedFrames = videoDuration
    ? Math.min(2000, Math.floor(((endTime || videoDuration) - startTime) * fps))
    : 0

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <canvas ref={canvasRef} className="sr-only" aria-hidden />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Video to Images
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Extract frames as WebP or PNG. Runs entirely in your browser — nothing uploaded.
          </p>
        </div>

        {/* Upload */}
        {!videoFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f?.type.startsWith("video/")) loadVideo(f)
            }}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-200 px-4 py-12 text-center transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 sm:py-16"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Film className="h-5 w-5 text-neutral-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Drop a video here, or click to browse
              </p>
              <p className="mt-1 text-xs text-neutral-500">MP4, MOV, AVI, MKV, WebM</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) loadVideo(f)
                e.target.value = ""
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video player */}
            <div className="relative overflow-hidden rounded-xl border border-neutral-100 bg-neutral-950 dark:border-neutral-800">
              <video
                ref={videoRef}
                src={videoUrl ?? undefined}
                onLoadedMetadata={handleVideoLoaded}
                controls
                className="w-full max-h-60 sm:max-h-80"
                preload="metadata"
              />
              <button
                onClick={reset}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 truncate">
              {videoFile.name}{videoDuration > 0 && ` · ${formatTime(videoDuration)}`}
            </p>

            {/* Settings panel */}
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">

              {/* Start time */}
              <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Start time (seconds)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={endTime}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => setStartTime(clamp(parseFloat(e.target.value) || 0, 0, endTime))}
                    className="w-24 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm tabular-nums focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    onClick={() => useCurrentPos(setStartTime)}
                    className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 transition-colors"
                  >
                    Use current position
                  </button>
                </div>
              </div>

              {/* End time */}
              <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">End time (seconds)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={startTime}
                    max={videoDuration}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => setEndTime(clamp(parseFloat(e.target.value) || 0, startTime, videoDuration))}
                    className="w-24 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm tabular-nums focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    onClick={() => useCurrentPos(setEndTime)}
                    className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 transition-colors"
                  >
                    Use current position
                  </button>
                </div>
              </div>

              {/* Size */}
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Size</span>
                <select
                  value={sizeIndex}
                  onChange={(e) => setSizeIndex(Number(e.target.value))}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  {SIZE_OPTIONS.map((o, i) => (
                    <option key={i} value={i}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* FPS */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Frame rate (FPS)
                    {estimatedFrames > 0 && (
                      <span className="ml-2 text-xs text-neutral-400">~{estimatedFrames} frames</span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={0.1}
                    max={60}
                    step={0.5}
                    value={fps}
                    onChange={(e) => setFps(clamp(parseFloat(e.target.value) || 1, 0.1, 60))}
                    className="w-20 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-right text-sm tabular-nums focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={30}
                  step={0.5}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-neutral-100"
                />
              </div>

              {/* Format */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Output format</span>
                <div className="flex gap-1">
                  {(["webp", "png"] as OutputFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        format === f
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality (webp only) */}
              {format === "webp" && (
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Quality</span>
                    <span className="text-sm tabular-nums text-neutral-500">{quality}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-neutral-900 dark:accent-neutral-100"
                  />
                </div>
              )}

              {/* Remove background — local only (WebGPU, not available on Vercel) */}
              {process.env.NEXT_PUBLIC_ENABLE_VIDEO_BG === "true" && (
                <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={removeBg}
                    onChange={(e) => setRemoveBg(e.target.checked)}
                    className="h-4 w-4 accent-neutral-900 dark:accent-neutral-100"
                  />
                  <div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Remove background</span>
                    <p className="text-xs text-neutral-400">GPU-accelerated · PNG gives transparency</p>
                  </div>
                </label>
              )}

              {/* Skip preview */}
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={skipPreview}
                  onChange={(e) => setSkipPreview(e.target.checked)}
                  className="h-4 w-4 accent-neutral-900 dark:accent-neutral-100"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Skip preview — just download the ZIP
                </span>
              </label>
            </div>

            {/* Extract button */}
            <button
              onClick={extract}
              disabled={status === "extracting" || !videoDuration}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {status === "extracting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting… {progress}%
                </>
              ) : (
                <>
                  <Image className="h-4 w-4" />
                  Extract {estimatedFrames > 0 ? `~${estimatedFrames} ` : ""}frames as {format.toUpperCase()}
                  {removeBg && " + remove bg"}
                </>
              )}
            </button>

            {/* bg model status */}
            {bgProgress && (
              <p className="text-center text-xs text-neutral-400">{bgProgress}</p>
            )}

            {/* Progress bar */}
            {status === "extracting" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Results */}
            {frames.length > 0 && status === "done" && (
              <div className="space-y-3">
                {/* Prominent download card */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        {frames.length} frame{frames.length !== 1 ? "s" : ""} extracted
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                        {format.toUpperCase()}{removeBg ? " · background removed" : ""}
                      </p>
                    </div>
                    <button
                      onClick={downloadAll}
                      disabled={isZipping}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                      {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {isZipping ? "Zipping…" : "Download ZIP"}
                    </button>
                  </div>
                </div>

                {!skipPreview && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {frames.map((frame) => (
                      <div key={frame.index} className="relative aspect-video overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        <img src={frame.dataUrl} alt={`Frame ${frame.index}`} className="h-full w-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">
                          {frame.timeS.toFixed(1)}s
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
