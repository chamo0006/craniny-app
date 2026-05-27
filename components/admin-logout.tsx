"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export default function AdminLogout() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => {})
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  )
}
