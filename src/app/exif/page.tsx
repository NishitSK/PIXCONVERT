"use client"

import { useState, useCallback } from "react"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { formatBytes } from "@/lib/utils/fileUtils"
import { ArrowLeft, ShieldCheck, Loader2, MapPin, Camera, Sliders, Calendar, Info } from "lucide-react"
import Link from "next/link"
import exifr from "exifr"
import { Navbar } from "@/components/layout/Navbar"

interface ExifData {
  make?: string
  model?: string
  lensModel?: string
  exposureTime?: number
  fNumber?: number
  iso?: number
  focalLength?: number
  dateTimeOriginal?: Date | string
  latitude?: number
  longitude?: number
  altitude?: number
  software?: string
  imageWidth?: number
  imageHeight?: number
  [key: string]: unknown
}

export default function ExifPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [exifData, setExifData] = useState<ExifData | null>(null)
  const [loading, setLoading] = useState(false)
  const [sanitizing, setSanitizing] = useState(false)
  const [sanitized, setSanitized] = useState(false)

  const handleFiles = useCallback(async (incoming: File[]) => {
    if (incoming.length === 0) return
    const selected = incoming[0]
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setLoading(true)
    setSanitized(false)
    setExifData(null)

    try {
      const output = await exifr.parse(selected, true)
      setExifData(output || {})
    } catch {
      setExifData({})
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl("")
    setExifData(null)
    setSanitized(false)
  }

  const sanitizeAndDownload = async () => {
    if (!file || !previewUrl) return
    setSanitizing(true)

    try {
      const img = document.createElement("img")
      img.src = previewUrl
      await new Promise((resolve) => { img.onload = resolve })

      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const ext = file.name.substring(file.name.lastIndexOf("."))
        const base = file.name.substring(0, file.name.lastIndexOf("."))
        a.download = `${base}_sanitized${ext || ".jpg"}`
        a.click()
        URL.revokeObjectURL(url)
        setSanitized(true)
        setSanitizing(false)
      }, file.type || "image/jpeg", 0.95)
    } catch {
      setSanitizing(false)
    }
  }

  const formatExposureTime = (val?: number) => {
    if (!val) return "N/A"
    if (val < 1) return `1/${Math.round(1 / val)}s`
    return `${val}s`
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
            EXIF Viewer & Privacy Sanitizer
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Inspect metadata, camera settings, and GPS location. Strip sensitive information with one click.
          </p>
        </div>

        {!file ? (
          <UploadDropzone onFiles={handleFiles} multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-4">
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="h-16 w-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                />
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
                    {file.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatBytes(file.size)} • {file.type || "Image"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={sanitizeAndDownload}
                  disabled={sanitizing}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {sanitizing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  Strip EXIF & Download
                </button>

                <button
                  onClick={reset}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Change file
                </button>
              </div>
            </div>

            {sanitized && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                EXIF metadata removed! Sanitized image downloaded without camera or location info.
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                <span className="text-xs">Reading EXIF tags...</span>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Camera Specs Card */}
                <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-sm">
                    <Camera className="h-4 w-4 text-neutral-500" />
                    Camera & Hardware
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">Make</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData?.make || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">Model</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData?.model || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">Lens</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">{exifData?.lensModel || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Software</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData?.software || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Exposure Specs Card */}
                <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-sm">
                    <Sliders className="h-4 w-4 text-neutral-500" />
                    Exposure & Shooting Settings
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">Shutter Speed</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatExposureTime(exifData?.exposureTime)}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">Aperture</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData?.fNumber ? `f/${exifData.fNumber}` : "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">ISO</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData?.iso ?? "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Focal Length</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData?.focalLength ? `${exifData.focalLength}mm` : "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* GPS Location Card */}
                <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-sm">
                    <MapPin className="h-4 w-4 text-neutral-500" />
                    Location & GPS
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {exifData?.latitude && exifData?.longitude ? (
                      <>
                        <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                          <span className="text-neutral-400">Latitude</span>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData.latitude.toFixed(6)}°</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                          <span className="text-neutral-400">Longitude</span>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{exifData.longitude.toFixed(6)}°</span>
                        </div>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${exifData.latitude}&mlon=${exifData.longitude}#map=16/${exifData.latitude}/${exifData.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline pt-1"
                        >
                          View location on OpenStreetMap →
                        </a>
                      </>
                    ) : (
                      <p className="text-neutral-400 italic py-2">No GPS geolocation data embedded in this image.</p>
                    )}
                  </div>
                </div>

                {/* Date & Info Card */}
                <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-sm">
                    <Calendar className="h-4 w-4 text-neutral-500" />
                    Timestamp & Resolution
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-2">
                      <span className="text-neutral-400">Date Taken</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {exifData?.dateTimeOriginal ? String(exifData.dateTimeOriginal) : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Dimensions</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {exifData?.imageWidth && exifData?.imageHeight ? `${exifData.imageWidth} × ${exifData.imageHeight} px` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All EXIF Metadata Dump */}
                {exifData && Object.keys(exifData).length > 0 && (
                  <div className="sm:col-span-2 rounded-xl border border-neutral-100 dark:border-neutral-800 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-sm">
                      <Info className="h-4 w-4 text-neutral-500" />
                      All Extracted Tags ({Object.keys(exifData).length})
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/40 p-3">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                            <th className="py-1 font-medium">Tag Key</th>
                            <th className="py-1 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 font-mono">
                          {Object.entries(exifData).map(([key, val]) => (
                            <tr key={key}>
                              <td className="py-1.5 text-neutral-500 pr-4">{key}</td>
                              <td className="py-1.5 text-neutral-800 dark:text-neutral-200 truncate max-w-xs">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-16 border-t border-neutral-100 dark:border-neutral-900 pt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Detailed",
                body: "Inspect camera hardware, ISO, aperture, shutter speed, timestamp, and GPS map location.",
              },
              {
                title: "Simple",
                body: "View summary cards or browse the full raw EXIF tag table in a clean, readable layout.",
              },
              {
                title: "Secure",
                body: "Strip sensitive camera and location EXIF tags with one click before sharing photos online.",
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
