"use client"

import { ProgressBar } from "./ProgressBar"
import { formatBytes } from "@/lib/utils/fileUtils"
import type { ConversionJob } from "@/types/conversion"

interface QueueSummaryBarProps {
  jobs: ConversionJob[]
  progress: number
  startedAt: number | null
}

export function QueueSummaryBar({ jobs, progress, startedAt }: QueueSummaryBarProps) {
  const total = jobs.length
  const completed = jobs.filter((j) => j.status === "completed").length
  const failed = jobs.filter((j) => j.status === "failed").length
  const running = jobs.filter((j) => j.status === "running").length

  const savedBytes = jobs.reduce((acc, j) => {
    if (j.result) return acc + (j.result.originalSize - j.result.outputSize)
    return acc
  }, 0)

  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0
  const rate = elapsed > 0 ? (completed + failed) / elapsed : 0
  const remaining = rate > 0 ? Math.ceil((total - completed - failed) / rate) : null

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {completed + failed} / {total}
        </span>
        <div className="flex gap-3 text-xs text-neutral-500">
          {completed > 0 && <span className="text-emerald-600 dark:text-emerald-400">{completed} done</span>}
          {failed > 0 && <span className="text-red-500">{failed} failed</span>}
          {running > 0 && <span>{running} converting…</span>}
          {remaining !== null && remaining > 0 && <span>~{remaining}s left</span>}
          {savedBytes > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatBytes(savedBytes)} saved
            </span>
          )}
        </div>
      </div>
      <ProgressBar value={progress} />
    </div>
  )
}
