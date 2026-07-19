"use client"

import { useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ImageIcon, FileText, Film, Eraser, ShieldCheck, Palette, Stamp } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
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
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Hero onUploadClick={scrollToDropzone} onLearnMoreClick={scrollToLearnMore} />

        <div ref={dropzoneRef} className="mx-auto max-w-3xl pb-12">
          <UploadDropzone onFiles={handleFiles} multiple allowFolder />
        </div>

        <section className="border-t border-neutral-100 py-12 dark:border-neutral-900">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              More tools
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

              <Link
                href="/video"
                className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
              >
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                  <Film className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Video to Images
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Extract frames from any video as WebP or PNG. Runs entirely in browser.
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                    Open tool →
                  </span>
                </div>
              </Link>

              <Link
                href="/remove-bg"
                className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
              >
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                  <Eraser className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Remove Background
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    AI-powered background removal running in browser.
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                    Open tool →
                  </span>
                </div>
              </Link>

              <Link
                href="/exif"
                className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
              >
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                  <ShieldCheck className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    EXIF Viewer & Privacy
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    View camera EXIF specs, GPS location, and strip metadata for privacy.
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                    Open tool →
                  </span>
                </div>
              </Link>

              <Link
                href="/palette"
                className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
              >
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                  <Palette className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Color Palette & Picker
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Extract dominant swatches & sample pixel colors with loupe view.
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                    Open tool →
                  </span>
                </div>
              </Link>

              <Link
                href="/watermark"
                className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-900 flex items-start gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
              >
                <div className="mt-0.5 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                  <Stamp className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Batch Watermarker
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Overlay custom text or logo image watermarks across multiple photos.
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
                  title: "Small",
                  body: "Smaller images mean faster load times. ImageTools can reduce file size and maintain high quality.",
                },
                {
                  title: "Simple",
                  body: "Open your image, inspect the differences, then save instantly. Feeling adventurous? Adjust the settings for even smaller files.",
                },
                {
                  title: "Secure",
                  body: "Worried about privacy? Images never leave your device since ImageTools does all the work locally.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-neutral-100 p-5 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/30"
                >
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">{item.body}</p>
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
