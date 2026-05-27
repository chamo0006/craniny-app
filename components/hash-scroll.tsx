"use client"

import { useEffect } from "react"

export function HashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash
      if (!hash) return
      const id = hash.replace("#", "")
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }

    scrollToHash()
    window.addEventListener("hashchange", scrollToHash)
    return () => window.removeEventListener("hashchange", scrollToHash)
  }, [])

  return null
}
