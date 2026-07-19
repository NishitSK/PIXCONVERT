"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Convert to WebP" },
    { href: "/pdf", label: "Images to PDF" },
    { href: "/video", label: "Video to Images" },
    { href: "/remove-bg", label: "Remove Background" },
    { href: "/exif", label: "EXIF Viewer" },
    { href: "/palette", label: "Color Palette" },
    { href: "/watermark", label: "Watermark" },
  ]

  return (
    <nav className="sticky top-0 z-30 border-b border-neutral-100 bg-white/80 backdrop-blur-md dark:border-neutral-900 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-base font-bold text-neutral-900 dark:text-neutral-100 shrink-0 mr-4"
        >
          ImageTools
        </Link>
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative px-2.5 py-1.5 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200"
              >
                {link.label}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-transform duration-300 ease-out origin-left ${
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
