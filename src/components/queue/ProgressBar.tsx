"use client"

import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number // 0-100
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-all duration-300 dark:bg-neutral-100"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-8 text-right text-xs tabular-nums text-neutral-500">{clamped}%</span>
      )}
    </div>
  )
}
