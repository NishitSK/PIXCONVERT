"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
      if (ingested.length > 0) submit(ingested, options)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const optionsRef = useRef(options)
  optionsRef.current = options
  const pendingReconvertRef = useRef(false)

  // When targetSizeKb changes, debounce a reconvert.
  // If conversion is still running, set a flag — the isDone effect below picks it up.
  useEffect(() => {
    if (options.targetSizeKb === null || !hasFiles) return
    if (!isDone) { pendingReconvertRef.current = true; return }
    pendingReconvertRef.current = false
    const timer = setTimeout(() => resubmitAll(optionsRef.current), 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.targetSizeKb])

  // When conversion finishes, fire any reconvert that was queued while it was running
  useEffect(() => {
    if (!isDone || !hasFiles || !pendingReconvertRef.current) return
    if (optionsRef.current.targetSizeKb === null) { pendingReconvertRef.current = false; return }
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
      await submit(ingested, options)
    },
    [ingest, submit, options]
  )

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
    startedRef.current = false
  }, [reset])

  const elapsed =
    state.startedAt && state.completedAt ? state.completedAt - state.startedAt : null

  // No files yet — full dropzone + settings
  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-6 pb-16">
        <UploadDropzone onFiles={handleFiles} multiple allowFolder />
        <div className="flex justify-end">
          <ConversionSettings options={options} onChange={setOptions} />
        </div>
      </div>
    )
  }

  // Files in progress or done — Version D layout
  return (
    <div className="py-6 pb-16">
      <div className="grid gap-4 sm:grid-cols-[1fr_420px]">

        {/* Left: dropzone (top, grows) → compare (bottom) */}
        <div className="flex flex-col gap-4">
          <UploadDropzone
            onFiles={handleFiles}
            multiple
            allowFolder
            disabled={isProcessing}
            className="flex-1 min-h-[180px]"
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
        <div className="flex flex-col gap-3">
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
