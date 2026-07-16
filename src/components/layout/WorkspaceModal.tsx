"use client"

import { useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { MainWorkspace } from "./MainWorkspace"
import type { ConversionOptions } from "@/types/conversion"

interface WorkspaceModalProps {
  initialFiles: File[]
  onClose: () => void
}

export function WorkspaceModal({ initialFiles, onClose }: WorkspaceModalProps) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-950"
      role="dialog"
      aria-modal="true"
      aria-label="Image conversion workspace"
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-100 px-4 dark:border-neutral-900 sm:px-6">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          WebP Converter
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close workspace"
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <MainWorkspace initialFiles={initialFiles} onClose={onClose} />
      </div>
    </div>
  )
}
