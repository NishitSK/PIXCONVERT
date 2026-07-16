"use client"

import { useReducer, useCallback, useRef } from "react"
import { jobQueueReducer, initialQueueState } from "@/lib/queue/jobQueue"
import { createJobs, type JobWithFile } from "@/lib/pipeline/jobFactory"
import type { IngestedFile } from "@/types/upload"
import type { ConversionOptions, ConversionResult } from "@/types/conversion"
import type { ConvertResponse } from "@/types/api"

const MAX_CONCURRENT = 4
const WAVE_SIZE = 20

export function useConversionQueue() {
  const [state, dispatch] = useReducer(jobQueueReducer, initialQueueState)
  const fileMapRef = useRef<Map<string, IngestedFile>>(new Map())
  // Maps jobId → object URL of the original file (for comparison view)
  const originalUrlsRef = useRef<Map<string, string>>(new Map())
  // Keeps the last submitted file list so resubmitAll can replay with new options
  const lastIngestedRef = useRef<IngestedFile[]>([])

  const submit = useCallback(
    async (ingestedFiles: IngestedFile[], options: ConversionOptions) => {
      lastIngestedRef.current = ingestedFiles
      const rawJobs = createJobs(ingestedFiles, options) as JobWithFile[]

      // Store file refs by job id
      for (const job of rawJobs) {
        if (job._ingestedFile) {
          fileMapRef.current.set(job.id, job._ingestedFile)
        }
      }

      // Strip internal _ingestedFile before dispatching (not part of ConversionJob type)
      const jobs = rawJobs.map(({ _ingestedFile: _, ...j }) => j)
      dispatch({ type: "ADD_JOBS", jobs })

      // Process pending jobs in waves of WAVE_SIZE, 4 concurrent within each wave
      const pendingJobs = rawJobs.filter((j) => j.status === "pending")
      for (let w = 0; w < pendingJobs.length; w += WAVE_SIZE) {
        const wave = pendingJobs.slice(w, w + WAVE_SIZE)
        for (let i = 0; i < wave.length; i += MAX_CONCURRENT) {
          await Promise.all(wave.slice(i, i + MAX_CONCURRENT).map((job) => processJob(job, options)))
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  async function processJob(job: JobWithFile, options: ConversionOptions) {
    const ingestedFile = fileMapRef.current.get(job.id)
    if (!ingestedFile) return

    dispatch({ type: "START_JOB", id: job.id })

    try {
      const formData = new FormData()
      formData.append("file", ingestedFile.file)
      formData.append("options", JSON.stringify(options))

      const res = await fetch("/api/convert", { method: "POST", body: formData })
      if (res.status === 413) {
        dispatch({ type: "FAIL_JOB", id: job.id, error: { code: "TOO_LARGE", message: "File too large (max 4 MB)." } })
        return
      }
      const data: ConvertResponse = await res.json()

      if (data.ok) {
        const result: ConversionResult = {
          jobId: job.id,
          outputName: data.outputName,
          relativePath: ingestedFile.relativePath,
          webpBase64: data.webpBase64,
          originalSize: data.originalSize,
          outputSize: data.outputSize,
          targetMissed: data.targetMissed,
        }
        // Store original object URL for comparison view
        originalUrlsRef.current.set(job.id, URL.createObjectURL(ingestedFile.file))
        dispatch({ type: "COMPLETE_JOB", id: job.id, result })
      } else {
        dispatch({
          type: "FAIL_JOB",
          id: job.id,
          error: { code: data.errorCode, message: data.message },
        })
      }
    } catch {
      dispatch({
        type: "FAIL_JOB",
        id: job.id,
        error: { code: "CONVERSION_FAILED", message: "Network error during conversion." },
      })
    }
  }

  const getOriginalUrl = useCallback((jobId: string) => {
    return originalUrlsRef.current.get(jobId) ?? null
  }, [])

  const reset = useCallback(() => {
    originalUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    originalUrlsRef.current.clear()
    fileMapRef.current.clear()
    lastIngestedRef.current = []
    dispatch({ type: "RESET" })
  }, [])

  // Re-run the last batch with new options (used when target size changes post-conversion)
  const resubmitAll = useCallback(
    async (options: ConversionOptions) => {
      const files = lastIngestedRef.current
      if (files.length === 0) return
      // Revoke old URLs — new ones will be created on completion
      originalUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      originalUrlsRef.current.clear()
      fileMapRef.current.clear()
      dispatch({ type: "RESET" })
      // Small tick so RESET flushes before ADD_JOBS
      await Promise.resolve()
      lastIngestedRef.current = files
      const rawJobs = createJobs(files, options) as JobWithFile[]
      for (const job of rawJobs) {
        if (job._ingestedFile) fileMapRef.current.set(job.id, job._ingestedFile)
      }
      const jobs = rawJobs.map(({ _ingestedFile: _, ...j }) => j)
      dispatch({ type: "ADD_JOBS", jobs })
      const pending = rawJobs.filter((j) => j.status === "pending")
      for (let w = 0; w < pending.length; w += WAVE_SIZE) {
        const wave = pending.slice(w, w + WAVE_SIZE)
        for (let i = 0; i < wave.length; i += MAX_CONCURRENT) {
          await Promise.all(wave.slice(i, i + MAX_CONCURRENT).map((job) => processJob(job, options)))
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const completed = state.jobs.filter((j) => j.status === "completed")
  const failed = state.jobs.filter((j) => j.status === "failed")
  const pending = state.jobs.filter((j) => j.status === "pending" || j.status === "running")
  const total = state.jobs.length
  const isDone = total > 0 && pending.length === 0
  const progress = total > 0 ? Math.round(((completed.length + failed.length) / total) * 100) : 0

  const hasFiles = lastIngestedRef.current.length > 0

  return {
    state,
    submit,
    reset,
    resubmitAll,
    hasFiles,
    getOriginalUrl,
    completed,
    failed,
    pending,
    total,
    isDone,
    progress,
  }
}
