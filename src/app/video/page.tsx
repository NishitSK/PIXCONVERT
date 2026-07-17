"use client"

import { useState, useRef, useCallback } from "react"
import { Film, Download, X, Loader2, ArrowLeft, Image } from "lucide-react"
import Link from "next/link"
import JSZip from "jszip"

type OutputFormat = "webp" | "png"
type ExtractMode = "interval" | "count"

interface Frame {
  index: number
  timeS: number
  dataUrl: string
}

const MAX_VIDEO_MB = 100

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export default function VideoPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [format, setFormat] = useState<OutputFormat>("webp")
  const [mode, setMode] = useState<ExtractMode>("interval")
  const [interval, setIntervalVal] = useState(1)
  const [frameCount, setFrameCount] = useState(10)
  const [quality, setQuality] = useState(90)
  const [frames, setFrames] = useState<Frame[]>([])
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
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
    setError("")
    setProgress(0)
  }, [videoUrl])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("video/")) loadVideo(file)
  }, [loadVideo])

  const handleVideoLoaded = () => {
    const v = videoRef.current
    if (v) setVideoDuration(v.duration)
  }

  const captureFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement, timeS: number, fmt: OutputFormat, q: number): Promise<string> => {
    return new Promise((resolve) => {
      video.currentTime = timeS
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked)
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(video, 0, 0)
        const mimeType = fmt === "webp" ? "image/webp" : "image/png"
        resolve(canvas.toDataURL(mimeType, q / 100))
      }
      video.addEventListener("seeked", onSeeked)
    })
  }

  const extract = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !videoDuration) return

    setStatus("extracting")
    setFrames([])
    setProgress(0)

    const timestamps: number[] = []
    if (mode === "interval") {
      for (let t = 0; t < videoDuration; t += interval) timestamps.push(parseFloat(t.toFixed(3)))
    } else {
      const step = videoDuration / frameCount
      for (let i = 0; i < frameCount; i++) timestamps.push(parseFloat((i * step).toFixed(3)))
    }

    const extracted: Frame[] = []
    for (let i = 0; i < timestamps.length; i++) {
      try {
        const dataUrl = await captureFrame(video, canvas, timestamps[i], format, quality)
        extracted.push({ index: i + 1, timeS: timestamps[i], dataUrl })
        setFrames([...extracted])
        setProgress(Math.round(((i + 1) / timestamps.length) * 100))
      } catch {
        // skip bad frames
      }
    }

    setStatus("done")
  }, [videoDuration, mode, interval, frameCount, format, quality])

  const downloadAll = useCallback(async () => {
    if (!frames.length) return
    setIsZipping(true)
    const zip = new JSZip()
    const ext = format === "webp" ? "webp" : "png"
    for (const frame of frames) {
      const base64 = frame.dataUrl.split(",")[1]
      zip.file(`frame_${String(frame.index).padStart(4, "0")}_${formatTime(frame.timeS).replace(":", "m")}s.${ext}`, base64, { base64: true })
    }
    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `frames_${videoFile?.name.replace(/\.[^.]+$/, "") ?? "video"}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setIsZipping(false)
  }, [frames, format, videoFile])

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setVideoDuration(0)
    setFrames([])
    setStatus("idle")
    setError("")
    setProgress(0)
  }

  const estimatedFrames = videoDuration
    ? mode === "interval"
      ? Math.floor(videoDuration / interval)
      : frameCount
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

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Video to Images
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Extract frames from any video as WebP or PNG. Processed entirely in your browser — nothing uploaded.
          </p>
        </div>

        {/* Upload area */}
        {!videoFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
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
              <p className="mt-1 text-xs text-neutral-500">
                MP4, MOV, AVI, MKV, WebM · Max {MAX_VIDEO_MB} MB
              </p>
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
            {/* Video preview */}
            <div className="relative overflow-hidden rounded-xl border border-neutral-100 bg-neutral-950 dark:border-neutral-800">
              <video
                ref={videoRef}
                src={videoUrl ?? undefined}
                onLoadedMetadata={handleVideoLoaded}
                controls
                className="w-full max-h-56 sm:max-h-72"
                preload="metadata"
              />
              <button
                onClick={reset}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* File info */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="truncate">{videoFile.name}</span>
              {videoDuration > 0 && <span className="shrink-0 ml-3">Duration: {formatTime(videoDuration)}</span>}
            </div>

            {/* Settings */}
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
              {/* Format */}
              <div className="flex items-center justify-between px-4 py-3">
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

              {/* Extraction mode */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Extract by</span>
                <div className="flex gap-1">
                  {([["interval", "Interval"], ["count", "Frame count"]] as [ExtractMode, string][]).map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        mode === m
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval or count */}
              {mode === "interval" ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Every N seconds</span>
                    {videoDuration > 0 && (
                      <p className="text-xs text-neutral-400">~{estimatedFrames} frames</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={interval}
                      onChange={(e) => setIntervalVal(Math.max(0.1, Number(e.target.value)))}
                      className="w-20 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-right text-sm tabular-nums focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                    <span className="text-xs text-neutral-400">s</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Number of frames</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    value={frameCount}
                    onChange={(e) => setFrameCount(Math.min(500, Math.max(1, Number(e.target.value))))}
                    className="w-20 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-right text-sm tabular-nums focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                </div>
              )}

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
                  Extract {estimatedFrames > 0 ? `~${estimatedFrames} ` : ""}frames
                </>
              )}
            </button>

            {/* Progress bar */}
            {status === "extracting" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Results */}
            {frames.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {frames.length} frame{frames.length !== 1 ? "s" : ""} extracted
                  </p>
                  {status === "done" && (
                    <button
                      onClick={downloadAll}
                      disabled={isZipping}
                      className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-60 transition-colors"
                    >
                      {isZipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Download ZIP
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {frames.map((frame) => (
                    <div key={frame.index} className="group relative aspect-video overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <img src={frame.dataUrl} alt={`Frame ${frame.index}`} className="h-full w-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">
                        {formatTime(frame.timeS)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
