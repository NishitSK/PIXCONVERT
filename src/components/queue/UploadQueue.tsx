"use client"

import { QueueItem } from "./QueueItem"
import { QueueSummaryBar } from "./QueueSummaryBar"
import type { ConversionJob } from "@/types/conversion"

interface UploadQueueProps {
  jobs: ConversionJob[]
  progress: number
  startedAt: number | null
  onDownload: (job: ConversionJob) => void
}

export function UploadQueue({ jobs, progress, startedAt, onDownload }: UploadQueueProps) {
  if (jobs.length === 0) return null

  return (
    <div className="space-y-2">
      <QueueSummaryBar jobs={jobs} progress={progress} startedAt={startedAt} />
      <div
        className="max-h-80 overflow-y-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        role="list"
        aria-label="Conversion queue"
      >
        {jobs.map((job) => (
          <div
            key={job.id}
            role="listitem"
            className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
          >
            <QueueItem job={job} onDownload={onDownload} />
          </div>
        ))}
      </div>
    </div>
  )
}
