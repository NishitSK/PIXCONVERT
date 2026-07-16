export function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf(".")
  return idx === -1 ? filename : filename.slice(0, idx)
}

export function toWebPName(filename: string): string {
  return stripExtension(filename) + ".webp"
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getBasename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

export function getDirname(path: string): string {
  const parts = path.split(/[/\\]/)
  parts.pop()
  return parts.join("/")
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/")
}
