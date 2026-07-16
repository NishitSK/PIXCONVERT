"use client"

import { useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ImageIcon, FileText } from "lucide-react"
import { Hero } from "@/components/layout/Hero"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { usePendingFiles } from "@/context/FilesContext"

export default function Home() {
  const dropzoneRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { setPendingFiles } = usePendingFiles()

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      setPendingFiles(files)
      router.push("/editor")
    },
    [setPendingFiles, router]
  )

  const scrollToDropzone = () => {
    dropzoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const scrollToLearnMore = () => {
    document.getElementById("learn-more")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <nav className="sticky top-0 z-30 border-b border-neutral-100 bg-white/80 backdrop-blur-md dark:border-neutral-900 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            ImageTools
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={scrollToDropzone}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
            >
              Convert to WebP
            </button>
            <Link
              href="/pdf"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
            >
              Images to PDF
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Hero onUploadClick={scrollToDropzone} onLearnMoreClick={scrollToLearnMore} />

        <div ref={dropzoneRef} className="mx-auto max-w-3xl pb-12">
          <UploadDropzone onFiles={handleFiles} multiple allowFolder />
        </div>

        <section className="border-t border-neutral-100 py-12 dark:border-neutral-900">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              More tools
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
                  <ImageIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Images to WebP
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Convert JPG, PNG, HEIC and more to WebP with quality control.
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-neutral-400">
                    You&apos;re here
                  </span>
                </div>
              </div>

              <Link
                href="/pdf"
                className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
              >
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                  <FileText className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Images to PDF
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Combine multiple images into a single PDF with custom page sizes.
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                    Open tool →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section
          id="learn-more"
          className="border-t border-neutral-100 py-16 dark:border-neutral-900"
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Why WebP?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              WebP is a modern image format developed by Google that provides superior compression
              for images on the web. WebP images are 25–34% smaller than comparable JPEG images
              and 26% smaller than PNG, with no perceptible loss in quality at default settings.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Batch processing",
                  body: "Convert hundreds of images at once. Upload a folder or ZIP archive and download all results in one click.",
                },
                {
                  title: "Privacy first",
                  body: "Files are processed server-side and immediately discarded. Nothing is stored or logged.",
                },
                {
                  title: "Folder structure",
                  body: "Original directory structure is preserved inside the downloaded ZIP — no manual reorganization needed.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900"
                >
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-neutral-100 py-6 text-center text-xs text-neutral-400 dark:border-neutral-900">
        WebP Converter · Fast, private, free
      </footer>
    </main>
  )
}
