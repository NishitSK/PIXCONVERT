"use client"

import { useCallback } from "react"
import { detectUploadMode } from "@/lib/pipeline/detector"
import { enumerateFiles } from "@/lib/pipeline/enumerator"
import type { FileWithPath } from "@/components/upload/UploadDropzone"
import type { IngestedFile } from "@/types/upload"

export function useFileIngestion() {
  const ingest = useCallback(async (files: FileWithPath[]): Promise<IngestedFile[]> => {
    if (files.length === 0) return []
    const mode = detectUploadMode(files)
    return enumerateFiles(files, mode)
  }, [])

  return { ingest }
}
