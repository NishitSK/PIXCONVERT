"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ImageComparisonProps {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  className?: string
}

export function ImageComparison({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "WebP",
  className,
}: ImageComparisonProps) {
  const [position, setPosition] = useState(50) // 0–100 %
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const clamp = (v: number) => Math.min(100, Math.max(0, v))

  const positionFromEvent = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 50
    return clamp(((clientX - rect.left) / rect.width) * 100)
  }, [])

  // Mouse
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    setPosition(positionFromEvent(e.clientX))
  }, [positionFromEvent])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => setPosition(positionFromEvent(e.clientX))
    const onUp = () => setDragging(false)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [dragging, positionFromEvent])

  // Touch
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true)
    setPosition(positionFromEvent(e.touches[0].clientX))
  }, [positionFromEvent])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      setPosition(positionFromEvent(e.touches[0].clientX))
    }
    const onEnd = () => setDragging(false)
    window.addEventListener("touchmove", onMove, { passive: false })
    window.addEventListener("touchend", onEnd)
    return () => {
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
    }
  }, [dragging, positionFromEvent])

  // Keyboard
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => clamp(p - 2))
    if (e.key === "ArrowRight") setPosition((p) => clamp(p + 2))
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative select-none overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900",
        dragging ? "cursor-col-resize" : "cursor-default",
        className
      )}
      style={{ minHeight: 200 }}
    >
      {/* AFTER (WebP) — full width underneath */}
      <img
        src={afterSrc}
        alt="Converted WebP"
        draggable={false}
        className="block h-full w-full object-contain"
        style={{ maxHeight: 480 }}
      />

      {/* BEFORE (original) — clipped to left of divider */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt="Original image"
          draggable={false}
          className="block h-full w-full object-contain"
          style={{ maxHeight: 480 }}
        />
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        {afterLabel}
      </span>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${position}%` }}
      />

      {/* Drag handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onKeyDown={onKeyDown}
        className={cn(
          "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 cursor-col-resize items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
          dragging ? "scale-110" : "group-hover:scale-105"
        )}
        style={{ left: `${position}%` }}
      >
        {/* Left/right arrows */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-neutral-500">
          <path d="M5 4L1 8l4 4M11 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}
