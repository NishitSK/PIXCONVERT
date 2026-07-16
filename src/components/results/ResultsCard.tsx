"use client"

import { CheckCircle2, AlertCircle } from "lucide-react"
import { formatBytes } from "@/lib/utils/fileUtils"
import type { ConversionJob } from "@/types/conversion"

interface ResultsCardProps {
  jobs: ConversionJob[]
  elapsed: number | null
}

export function ResultsCard({ jobs, elapsed }: ResultsCardProps) {
  const completed = jobs.filter((j) => j.status === "completed")
  const failed = jobs.filter((j) => j.status === "failed")

  const originalTotal = completed.reduce((a, j) => a + (j.result?.originalSize ?? 0), 0)
  const outputTotal = completed.reduce((a, j) => a + (j.result?.outputSize ?? 0), 0)
  const saved = originalTotal - outputTotal
  const savedPct = originalTotal > 0 ? Math.round((saved / originalTotal) * 100) : 0

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Results</h3>
        {elapsed !== null && (
          <span className="text-xs text-neutral-400">{(elapsed / 1000).toFixed(1)}s</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Converted" value={String(completed.length)} />
        <Stat label="Failed" value={String(failed.length)} highlight={failed.length > 0 ? "red" : undefined} />
        <Stat label="Size saved" value={saved > 0 ? formatBytes(saved) : "—"} highlight={saved > 0 ? "green" : undefined} />
        <Stat label="Reduction" value={savedPct > 0 ? `${savedPct}%` : "—"} />
      </div>

      {failed.length > 0 && (
        <div className="mt-3 space-y-1">
          {failed.map((j) => (
            <div key={j.id} className="flex items-start gap-2 text-xs text-red-500">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium">{j.filename}</span>: {j.error?.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: "red" | "green"
}) {
  return (
    <div className="rounded-md bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-900">
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          highlight === "green"
            ? "text-emerald-600 dark:text-emerald-400"
            : highlight === "red"
            ? "text-red-500"
            : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {value}
      </p>
    </div>
  )
}
