"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Upload, FolderOpen, FileArchive } from "lucide-react"
import { cn } from "@/lib/utils"
import { isAccepted } from "@/lib/conversion/formats"

export type FileWithPath = File & { _relativePath?: string }

interface UploadDropzoneProps {
  onFiles: (files: FileWithPath[]) => void
  multiple?: boolean
  allowFolder?: boolean
  disabled?: boolean
  className?: string
}

export function UploadDropzone({
  onFiles,
  multiple = true,
  allowFolder = true,
  disabled = false,
  className,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [folderTip, setFolderTip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const folderMountRef = useRef<HTMLSpanElement>(null)
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles

  // Create the webkitdirectory input imperatively — React strips the attribute during reconciliation
  useEffect(() => {
    const container = folderMountRef.current
    if (!container || folderInputRef.current) return

    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.setAttribute("webkitdirectory", "")
    input.className = "sr-only"
    input.setAttribute("tabindex", "-1")
    input.setAttribute("aria-hidden", "true")

    input.addEventListener("change", () => {
      if (!input.files || input.files.length === 0) return
      const arr = Array.from(input.files) as FileWithPath[]
      arr.forEach((f) => {
        const wkp = (f as File & { webkitRelativePath?: string }).webkitRelativePath
        if (wkp) f._relativePath = wkp
      })
      setStatus(null)
      setFolderTip(false)
      onFilesRef.current(arr)
      input.value = ""
    })

    container.appendChild(input)
    folderInputRef.current = input
    return () => {
      container.removeChild(input)
      folderInputRef.current = null
    }
  }, [])

  const handleRawFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const arr = Array.from(files) as FileWithPath[]
    arr.forEach((f) => {
      const wkp = (f as File & { webkitRelativePath?: string }).webkitRelativePath
      if (wkp) f._relativePath = wkp
    })
    onFilesRef.current(arr)
  }, [])

  const openFolderPicker = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setStatus(null)
    setFolderTip(false)

    // Try the modern File System Access API first (Chrome, Edge)
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as unknown as {
          showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
        }).showDirectoryPicker()

        setStatus("Reading folder…")
        const collected: FileWithPath[] = []
        await walkDirectory(dirHandle, dirHandle.name, collected)

        if (collected.length === 0) {
          setStatus("No supported images found in that folder.")
          return
        }
        setStatus(null)
        onFilesRef.current(collected)
        return
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus(null) // user cancelled
          return
        }
        // API blocked (e.g. Brave Shields) — fall through to webkitdirectory
      }
    }

    // Fallback: webkitdirectory input (Brave, Firefox, Safari)
    setFolderTip(true)
    folderInputRef.current?.click()
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }, [])

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const items = e.dataTransfer.items
    if (items && items.length > 0) {
      // Check if any dropped item is a directory — use webkitGetAsEntry for recursive walk
      const entries = Array.from(items)
        .map((i) => i.webkitGetAsEntry?.())
        .filter(Boolean) as FileSystemEntry[]

      const hasDir = entries.some((en) => en.isDirectory)
      if (hasDir) {
        setStatus("Reading folder…")
        const collected: FileWithPath[] = []
        await Promise.all(entries.map((en) => walkEntry(en, en.name, collected)))
        if (collected.length === 0) {
          setStatus("No supported images found in that folder.")
        } else {
          setStatus(null)
          onFilesRef.current(collected)
        }
        return
      }
    }

    handleRawFiles(e.dataTransfer.files)
  }, [handleRawFiles])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload images — click to browse or drag and drop"
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors outline-none",
      className,
        isDragging
          ? "border-neutral-400 bg-neutral-50 dark:border-neutral-500 dark:bg-neutral-900"
          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700",
        disabled && "pointer-events-none opacity-50"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <Upload className="h-5 w-5 text-neutral-500" />
      </div>

      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Drop images or folders here, or click to browse
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          JPG, PNG, BMP, TIFF, GIF, HEIC, AVIF, SVG · Max 50 MB per file
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        >
          <FileArchive className="h-3.5 w-3.5" />
          Files / ZIP
        </button>

        {allowFolder && (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            onClick={openFolderPicker}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Folder
          </button>
        )}
      </div>

      {/* Status / tip messages */}
      {status && (
        <p className={cn("text-xs", status.startsWith("Reading") ? "text-neutral-400" : "text-red-500")}>
          {status}
        </p>
      )}
      {folderTip && !status && (
        <p className="max-w-xs text-xs text-neutral-400">
          Navigate <strong>into</strong> your folder, then press <strong>Open</strong> to submit all images inside it.
        </p>
      )}

      {/* Files / ZIP picker */}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple={multiple}
        accept="image/jpeg,image/png,image/bmp,image/tiff,image/gif,image/heic,image/heif,image/avif,image/svg+xml,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.gif,.heic,.heif,.avif,.svg,.zip"
        onChange={(e) => { handleRawFiles(e.target.files); e.target.value = "" }}
        tabIndex={-1}
        aria-hidden
      />

      {/* Folder fallback input — webkitdirectory set imperatively */}
      <span ref={folderMountRef} aria-hidden />
    </div>
  )
}

async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: FileWithPath[]
): Promise<void> {
  if (entry.isFile) {
    const file: FileWithPath = await new Promise((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej)
    )
    if (isAccepted(file.name, file.type)) {
      file._relativePath = `${prefix}`
      out.push(file)
    }
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const readAll = (): Promise<FileSystemEntry[]> =>
      new Promise((res, rej) => reader.readEntries(res, rej))
    let batch: FileSystemEntry[]
    do {
      batch = await readAll()
      await Promise.all(batch.map((e) => walkEntry(e, `${prefix}/${e.name}`, out)))
    } while (batch.length > 0)
  }
}

async function walkDirectory(
  handle: FileSystemDirectoryHandle,
  prefix: string,
  out: FileWithPath[]
): Promise<void> {
  // @ts-expect-error values() exists at runtime; missing from older TS lib types
  for await (const entry of handle.values()) {
    if (entry.kind === "file") {
      const file: FileWithPath = await (entry as FileSystemFileHandle).getFile()
      if (isAccepted(file.name, file.type)) {
        file._relativePath = `${prefix}/${file.name}`
        out.push(file)
      }
    } else if (entry.kind === "directory") {
      await walkDirectory(entry as FileSystemDirectoryHandle, `${prefix}/${entry.name}`, out)
    }
  }
}
