"use client"

import { useEffect } from "react"

const NAVBAR_HEIGHT = 64

export function HashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash
      if (!hash) return
      const id = hash.replace("#", "")
      if (id === "inicio") {
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      const el = document.getElementById(id)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT
        window.scrollTo({ top, behavior: "smooth" })
      }
    }

    // Small delay so the page renders with skeleton cards before measuring
    const timer = setTimeout(scrollToHash, 80)
    window.addEventListener("hashchange", scrollToHash)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("hashchange", scrollToHash)
    }
  }, [])

  return null
}
