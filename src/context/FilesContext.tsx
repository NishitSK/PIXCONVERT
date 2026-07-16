"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface FilesContextValue {
  pendingFiles: File[]
  setPendingFiles: (files: File[]) => void
  clearFiles: () => void
}

const FilesContext = createContext<FilesContextValue | null>(null)

export function FilesProvider({ children }: { children: React.ReactNode }) {
  const [pendingFiles, setPendingFilesState] = useState<File[]>([])

  const setPendingFiles = useCallback((files: File[]) => {
    setPendingFilesState(files)
  }, [])

  const clearFiles = useCallback(() => {
    setPendingFilesState([])
  }, [])

  return (
    <FilesContext.Provider value={{ pendingFiles, setPendingFiles, clearFiles }}>
      {children}
    </FilesContext.Provider>
  )
}

export function usePendingFiles() {
  const ctx = useContext(FilesContext)
  if (!ctx) throw new Error("usePendingFiles must be used inside FilesProvider")
  return ctx
}
