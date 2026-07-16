"use client"

import { Download, Archive } from "lucide-react"
import { formatBytes } from "@/lib/utils/fileUtils"
import type { ConversionJob } from "@/types/conversion"

interface DownloadCardProps {
  jobs: ConversionJob[]
  onDownloadAll: () => void
  isDownloading?: boolean
}

export function DownloadCard({ jobs, onDownloadAll, isDownloading }: DownloadCardProps) {
  const completed = jobs.filter((j) => j.status === "completed" && j.result)
  if (completed.length === 0) return null

  const totalOriginal = completed.reduce((s, j) => s + (j.result?.originalSize ?? 0), 0)
  const totalOutput = completed.reduce((s, j) => s + (j.result?.outputSize ?? 0), 0)
  const savings = totalOriginal > 0 ? Math.round((1 - totalOutput / totalOriginal) * 100) : 0

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {completed.length === 1 ? "1 image converted" : `${completed.length} images converted`}
          </p>
          <p className="text-xs text-neutral-500">
            {formatBytes(totalOriginal)} → {formatBytes(totalOutput)}
            {savings > 0 && (
              <span className="ml-1 text-emerald-600 dark:text-emerald-400">−{savings}%</span>
            )}
            {completed.length > 1 && <span className="ml-1">· ZIP</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadAll}
          disabled={isDownloading}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          {completed.length === 1 ? <Download className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {isDownloading ? "Preparing…" : completed.length === 1 ? "Download" : "Download ZIP"}
        </button>
      </div>
    </div>
  )
}
