"use client"

import { useState } from "react"
import { ImageComparison } from "./ImageComparison"
import { formatBytes } from "@/lib/utils/fileUtils"
import type { ConversionJob } from "@/types/conversion"

interface ComparisonPanelProps {
  jobs: ConversionJob[]
  getOriginalUrl: (jobId: string) => string | null
}

export function ComparisonPanel({ jobs, getOriginalUrl }: ComparisonPanelProps) {
  const completed = jobs.filter((j) => j.status === "completed" && j.result)
  const [selectedId, setSelectedId] = useState<string>(completed[0]?.id ?? "")

  if (completed.length === 0) return null

  const selected = completed.find((j) => j.id === selectedId) ?? completed[0]
  const originalUrl = getOriginalUrl(selected.id)
  const webpSrc = selected.result
    ? `data:image/webp;base64,${selected.result.webpBase64}`
    : null
  const savings = selected.result
    ? Math.round((1 - selected.result.outputSize / selected.result.originalSize) * 100)
    : 0

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Compare
        </h3>

        {/* Compact dropdown — replaces the pill grid */}
        {completed.length > 1 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="min-w-0 flex-1 truncate rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            {completed.map((job) => (
              <option key={job.id} value={job.id}>
                {job.filename}
              </option>
            ))}
          </select>
        )}

        {selected.result && (
          <span className="shrink-0 text-xs text-neutral-400">
            {formatBytes(selected.result.originalSize)} → {formatBytes(selected.result.outputSize)}
            {savings > 0 && (
              <span className="ml-1 text-emerald-600 dark:text-emerald-400">−{savings}%</span>
            )}
          </span>
        )}
      </div>

      {originalUrl && webpSrc ? (
        <ImageComparison
          beforeSrc={originalUrl}
          afterSrc={webpSrc}
          beforeLabel="Original"
          afterLabel="WebP"
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-xs text-neutral-400 dark:border-neutral-800">
          Preview not available
        </div>
      )}

      <p className="mt-2 text-center text-xs text-neutral-400">
        Drag the line · Arrow keys to nudge
      </p>
    </div>
  )
}
