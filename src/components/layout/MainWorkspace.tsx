"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Zap } from "lucide-react"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { ConversionSettings } from "@/components/settings/ConversionSettings"
import { UploadQueue } from "@/components/queue/UploadQueue"
import { ResultsCard } from "@/components/results/ResultsCard"
import { DownloadCard } from "@/components/results/DownloadCard"
import { ComparisonPanel } from "@/components/results/ComparisonPanel"
import { useConversionQueue } from "@/hooks/useConversionQueue"
import { useFileIngestion } from "@/hooks/useFileIngestion"
import { useDownload } from "@/hooks/useDownload"
import type { ConversionOptions, ConversionJob } from "@/types/conversion"
import type { IngestedFile } from "@/types/upload"

const DEFAULT_OPTIONS: ConversionOptions = {
  quality: 80,
  lossless: false,
  keepMetadata: false,
  targetSizeKb: null,
}

interface MainWorkspaceProps {
  initialFiles?: File[]
  onClose?: () => void
}

export function MainWorkspace({ initialFiles, onClose }: MainWorkspaceProps) {
  const [options, setOptions] = useState<ConversionOptions>(DEFAULT_OPTIONS)
  const [isDownloading, setIsDownloading] = useState(false)
  // Files staged but not yet converted — waiting for user to confirm settings
  const [staged, setStaged] = useState<IngestedFile[]>([])

  const { state, submit, reset, resubmitAll, hasFiles, getOriginalUrl, completed, total, isDone, progress } =
    useConversionQueue()
  const { ingest } = useFileIngestion()
  const { downloadResult, downloadAll } = useDownload()

  const isProcessing = total > 0 && !isDone

  const startedRef = useRef(false)
  useEffect(() => {
    if (!initialFiles || initialFiles.length === 0 || startedRef.current) return
    startedRef.current = true
    ingest(initialFiles).then((ingested) => {
      if (ingested.length > 0) setStaged(ingested)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const optionsRef = useRef(options)
  optionsRef.current = options
  const pendingReconvertRef = useRef(false)

  // When quality, lossless, or targetSizeKb changes after conversion is done, reconvert.
  // If conversion is still running, set a flag — the isDone effect below picks it up.
  useEffect(() => {
    if (!hasFiles) return
    if (!isDone) { pendingReconvertRef.current = true; return }
    pendingReconvertRef.current = false
    const timer = setTimeout(() => resubmitAll(optionsRef.current), 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.quality, options.lossless, options.targetSizeKb])

  // When conversion finishes, fire any reconvert that was queued while it was running
  useEffect(() => {
    if (!isDone || !hasFiles || !pendingReconvertRef.current) return
    pendingReconvertRef.current = false
    const timer = setTimeout(() => resubmitAll(optionsRef.current), 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone])

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const ingested = await ingest(files)
      if (ingested.length === 0) return
      setStaged(ingested)
    },
    [ingest]
  )

  const handleConfirm = useCallback(() => {
    if (staged.length === 0) return
    const toSubmit = staged
    setStaged([])
    submit(toSubmit, optionsRef.current)
  }, [staged, submit])

  const handleDownload = useCallback(
    (job: ConversionJob) => {
      if (job.result) downloadResult(job.result)
    },
    [downloadResult]
  )

  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true)
    try {
      const results = completed.map((j) => j.result!).filter(Boolean)
      await downloadAll(results, "converted_webp.zip")
    } finally {
      setIsDownloading(false)
    }
  }, [completed, downloadAll])

  const handleReset = useCallback(() => {
    reset()
    setStaged([])
    startedRef.current = false
  }, [reset])

  const elapsed =
    state.startedAt && state.completedAt ? state.completedAt - state.startedAt : null

  // No files yet — full dropzone + settings
  if (total === 0 && staged.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-4 pb-16 sm:py-6">
        <UploadDropzone onFiles={handleFiles} multiple allowFolder />
        <ConversionSettings options={options} onChange={setOptions} />
      </div>
    )
  }

  // Files staged — show settings confirmation before converting
  if (staged.length > 0 && total === 0) {
    return (
      <div className="mx-auto max-w-lg py-4 pb-16 space-y-3 sm:py-6 sm:space-y-4">
        <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {staged.length} file{staged.length !== 1 ? "s" : ""} ready
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            Set your options below, then start converting.
          </p>
        </div>

        <ConversionSettings options={options} onChange={setOptions} />

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
          >
            <Zap className="h-4 w-4" />
            Convert {staged.length} file{staged.length !== 1 ? "s" : ""}
          </button>
          <button
            onClick={handleReset}
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Files in progress or done — two-column on desktop, stacked on mobile
  return (
    <div className="py-4 pb-16 sm:py-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_420px]">

        {/* On mobile: right col renders first via order utilities so queue/results show at top */}

        {/* Left: dropzone → compare → footer actions */}
        <div className="order-2 flex flex-col gap-4 sm:order-1">
          <UploadDropzone
            onFiles={handleFiles}
            multiple
            allowFolder
            disabled={isProcessing}
            className="min-h-[140px] sm:flex-1 sm:min-h-[180px]"
          />

          <ComparisonPanel
            jobs={state.jobs}
            getOriginalUrl={getOriginalUrl}
          />

          {isDone && (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
              >
                Convert more images
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
                >
                  Back to home
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: settings → results → download → file queue */}
        <div className="order-1 flex flex-col gap-3 sm:order-2">
          <ConversionSettings
            options={options}
            onChange={setOptions}
            disabled={isProcessing}
          />

          {isDone && <ResultsCard jobs={state.jobs} elapsed={elapsed} />}

          {isDone && (
            <DownloadCard
              jobs={state.jobs}
              onDownloadAll={handleDownloadAll}
              isDownloading={isDownloading}
            />
          )}

          <UploadQueue
            jobs={state.jobs}
            progress={progress}
            startedAt={state.startedAt}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </div>
  )
}
