"use client"

import { useCallback, useRef } from "react"
import type { ConversionResult } from "@/types/conversion"
import type { ZipRequest } from "@/types/api"

export function useDownload() {
  const urlsRef = useRef<string[]>([])

  const downloadBase64 = useCallback((base64: string, filename: string, mime = "image/webp") => {
    const url = `data:${mime};base64,${base64}`
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }, [])

  const downloadResult = useCallback(
    (result: ConversionResult) => {
      downloadBase64(result.webpBase64, result.outputName)
    },
    [downloadBase64]
  )

  const downloadAll = useCallback(async (results: ConversionResult[], zipName = "converted.zip") => {
    if (results.length === 1) {
      downloadResult(results[0])
      return
    }

    const body: ZipRequest = {
      files: results.map((r) => ({
        relativePath: r.relativePath.replace(/\.[^.]+$/, ".webp"),
        base64: r.webpBase64,
        outputName: r.outputName,
      })),
      zipName,
    }

    const res = await fetch("/api/convert/zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error("ZIP packaging failed")

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    urlsRef.current.push(url)

    const a = document.createElement("a")
    a.href = url
    a.download = zipName
    a.click()

    setTimeout(() => {
      URL.revokeObjectURL(url)
      urlsRef.current = urlsRef.current.filter((u) => u !== url)
    }, 10000)
  }, [downloadResult])

  return { downloadResult, downloadAll, downloadBase64 }
}
