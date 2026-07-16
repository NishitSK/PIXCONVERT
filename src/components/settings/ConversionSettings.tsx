"use client"

import { useState, useEffect } from "react"
import type { ConversionOptions } from "@/types/conversion"

interface ConversionSettingsProps {
  options: ConversionOptions
  onChange: (options: ConversionOptions) => void
  disabled?: boolean
}

export function ConversionSettings({ options, onChange, disabled }: ConversionSettingsProps) {
  const set = <K extends keyof ConversionOptions>(key: K, value: ConversionOptions[K]) =>
    onChange({ ...options, [key]: value })

  const [targetInput, setTargetInput] = useState(options.targetSizeKb?.toString() ?? "")

  // Keep local input in sync if options are reset externally
  useEffect(() => {
    setTargetInput(options.targetSizeKb?.toString() ?? "")
  }, [options.targetSizeKb])

  const commitTarget = () => {
    const v = targetInput.trim()
    set("targetSizeKb", v === "" ? null : Math.max(1, Number(v)))
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Settings
      </h3>

      <div className="space-y-5">
        {/* Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="quality-slider"
              className="text-sm text-neutral-700 dark:text-neutral-300"
            >
              Quality
            </label>
            <span className="w-8 text-right text-sm tabular-nums text-neutral-500">
              {options.quality}
            </span>
          </div>
          <input
            id="quality-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={options.quality}
            disabled={disabled || options.lossless}
            onChange={(e) => set("quality", Number(e.target.value))}
            className="w-full accent-neutral-900 disabled:opacity-40 dark:accent-neutral-100"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={options.quality}
          />
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Smaller</span>
            <span>Better</span>
          </div>
        </div>

        {/* Lossless */}
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="lossless-toggle"
              className="cursor-pointer text-sm text-neutral-700 dark:text-neutral-300"
            >
              Lossless
            </label>
            <p className="text-xs text-neutral-400">Larger file, perfect quality</p>
          </div>
          <button
            id="lossless-toggle"
            role="switch"
            type="button"
            aria-checked={options.lossless}
            disabled={disabled}
            onClick={() => set("lossless", !options.lossless)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-40 ${
              options.lossless
                ? "bg-neutral-900 dark:bg-neutral-100"
                : "bg-neutral-200 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full shadow-sm transition-transform ${
                options.lossless
                  ? "translate-x-4 bg-white dark:bg-neutral-900"
                  : "translate-x-0 bg-white dark:bg-neutral-400"
              }`}
            />
          </button>
        </div>

        {/* Target size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="target-size"
              className="text-sm text-neutral-700 dark:text-neutral-300"
            >
              Target size
            </label>
            {options.targetSizeKb !== null && (
              <button
                type="button"
                onClick={() => { setTargetInput(""); set("targetSizeKb", null) }}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                disabled={disabled}
              >
                clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="target-size"
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 200"
              value={targetInput}
              disabled={disabled || options.lossless}
              onChange={(e) => setTargetInput(e.target.value)}
              onBlur={commitTarget}
              onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); commitTarget() } }}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm tabular-nums text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-600 dark:focus:border-neutral-500"
            />
            <span className="shrink-0 text-xs text-neutral-400">KB</span>
          </div>
          <p className="text-xs text-neutral-400">
            {options.targetSizeKb
              ? `Auto-adjusts quality to fit under ${options.targetSizeKb} KB`
              : "Leave blank to use quality slider"}
          </p>
        </div>

        {/* Keep metadata */}
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="metadata-toggle"
              className="cursor-pointer text-sm text-neutral-700 dark:text-neutral-300"
            >
              Keep metadata
            </label>
            <p className="text-xs text-neutral-400">Preserve EXIF, GPS, camera info</p>
          </div>
          <button
            id="metadata-toggle"
            role="switch"
            type="button"
            aria-checked={options.keepMetadata}
            disabled={disabled}
            onClick={() => set("keepMetadata", !options.keepMetadata)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-40 ${
              options.keepMetadata
                ? "bg-neutral-900 dark:bg-neutral-100"
                : "bg-neutral-200 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full shadow-sm transition-transform ${
                options.keepMetadata
                  ? "translate-x-4 bg-white dark:bg-neutral-900"
                  : "translate-x-0 bg-white dark:bg-neutral-400"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
