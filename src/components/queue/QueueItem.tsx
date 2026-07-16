"use client"

import { CheckCircle2, XCircle, Clock, Loader2, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBytes } from "@/lib/utils/fileUtils"
import type { ConversionJob } from "@/types/conversion"

interface QueueItemProps {
  job: ConversionJob
  onDownload?: (job: ConversionJob) => void
}

const StatusIcon = ({ status }: { status: ConversionJob["status"] }) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-neutral-400" />
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />
  }
}

export function QueueItem({ job, onDownload }: QueueItemProps) {
  const sizeDelta =
    job.result
      ? job.result.originalSize - job.result.outputSize
      : null

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        job.status === "failed" && "bg-red-50 dark:bg-red-950/20",
        job.status === "completed" && "bg-transparent",
        job.status === "running" && "bg-neutral-50 dark:bg-neutral-900/50",
        job.status === "completed" && "bg-transparent"
      )}
    >
      <div className="mt-0.5 shrink-0">
        <StatusIcon status={job.status} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium",
            job.status === "failed"
              ? "text-red-700 dark:text-red-400"
              : "text-neutral-800 dark:text-neutral-200"
          )}
          title={job.relativePath}
        >
          {job.filename}
        </p>

        {job.relativePath !== job.filename && (
          <p className="truncate text-xs text-neutral-400" title={job.relativePath}>
            {job.relativePath}
          </p>
        )}

        {job.status === "completed" && job.result && (
          <>
            <p className="mt-0.5 text-xs text-neutral-500">
              {formatBytes(job.result.originalSize)} → {formatBytes(job.result.outputSize)}
              {sizeDelta !== null && sizeDelta > 0 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  (−{formatBytes(sizeDelta)})
                </span>
              )}
            </p>
            {job.result.targetMissed && (
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                Best achievable — can't compress below {formatBytes(job.result.outputSize)}
              </p>
            )}
          </>
        )}

        {job.status === "failed" && job.error && (
          <p className="mt-0.5 text-xs text-red-500">{job.error.message}</p>
        )}
      </div>

      {job.status === "completed" && onDownload && (
        <button
          type="button"
          aria-label={`Download ${job.result?.outputName}`}
          onClick={() => onDownload(job)}
          className="shrink-0 rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
