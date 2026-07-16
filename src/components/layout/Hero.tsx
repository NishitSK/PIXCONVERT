"use client"

interface HeroProps {
  onUploadClick: () => void
  onLearnMoreClick: () => void
}

export function Hero({ onUploadClick, onLearnMoreClick }: HeroProps) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          Fast · Free · Private — conversion happens server-side, files are not stored
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-5xl">
          Convert Images to WebP
        </h1>

        <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">
          Convert single images, folders, or ZIP archives into optimized WebP files in seconds.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onUploadClick}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Upload Images
          </button>
          <button
            type="button"
            onClick={onLearnMoreClick}
            className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Learn More
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-neutral-400">
          {["JPG", "PNG", "BMP", "TIFF", "GIF", "HEIC", "AVIF", "SVG"].map((fmt) => (
            <span key={fmt}>{fmt}</span>
          ))}
          <span className="text-neutral-300 dark:text-neutral-600">→</span>
          <span className="font-medium text-neutral-600 dark:text-neutral-300">WebP</span>
        </div>
      </div>
    </div>
  )
}
