"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, ChevronDown, ShoppingBag, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { useCart } from "@/context/cart-context"

const DEFAULT_CATEGORIES = ["Buzos", "Remeras", "Pantalones", "Camperas", "Bermudas", "Gorras"]
const categorySlug = (category: string) => category.toLowerCase().replace(/\s+/g, "-")

const navLinkClass =
  "text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900 whitespace-nowrap"

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false)
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const { openCart, count } = useCart()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const goToSection = (sectionId: string) => {
    closeMobileMenu()
    if (pathname === "/") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
    } else {
      window.location.href = `/#${sectionId}`
    }
  }

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories.map((c: { nombre: string }) => c.nombre))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProductsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isMobileMenuOpen])

  const closeMobileMenu = () => {
    document.body.style.overflow = ""
    setIsMobileMenuOpen(false)
    setIsMobileProductsOpen(false)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl text-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8">
            {/* Columna izquierda: hamburger (mobile) + logo (desktop) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-slate-900 transition-opacity hover:opacity-70 md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="size-6" />
              </button>
              <div className="hidden md:block">
                <Logo />
              </div>
            </div>

            {/* Columna central: logo centrado (mobile) | nav (desktop) */}
            <div className="flex items-center justify-center">
              <div className="md:hidden">
                <Logo />
              </div>
              <nav className="hidden items-center justify-center gap-6 lg:gap-10 md:flex">
                <Link href="/" className={navLinkClass}>INICIO</Link>

                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                    className={`flex items-center gap-1 ${navLinkClass}`}
                    aria-expanded={isProductsDropdownOpen}
                    aria-haspopup="true"
                  >
                    PRODUCTOS
                    <ChevronDown className={`size-4 transition-transform ${isProductsDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isProductsDropdownOpen && (
                    <div className="absolute top-full left-0 z-50 mt-2 min-w-[11rem] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      {categories.map((cat) => (
                        <Link
                          key={cat}
                          href={`/productos/${categorySlug(cat)}`}
                          className="block whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                          onClick={() => setIsProductsDropdownOpen(false)}
                        >
                          {cat}
                        </Link>
                      ))}
                      <div className="mt-1 border-t border-slate-100 pt-1">
                        <Link
                          href="/productos"
                          className="block whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setIsProductsDropdownOpen(false)}
                        >
                          Ver todos
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => goToSection("how-to-buy")} className={navLinkClass}>COMO COMPRAR</button>
                <button type="button" onClick={() => goToSection("about")} className={navLinkClass}>QUIENES SOMOS</button>
                <button type="button" onClick={() => goToSection("contact")} className={navLinkClass}>CONTACTO</button>
              </nav>
            </div>

            {/* Columna derecha: carrito */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-white transition hover:bg-slate-800 md:h-12 md:w-12"
                aria-label="Abrir carrito"
              >
                <ShoppingBag className="size-5" />
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-900">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer overlay ── */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobileMenu}
      />

      {/* ── Mobile slide-in drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[72%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <Logo />
          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col overflow-y-auto py-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            INICIO
          </Link>

          {/* Productos expandible */}
          <div>
            <button
              type="button"
              onClick={() => setIsMobileProductsOpen(!isMobileProductsOpen)}
              className="flex w-full items-center justify-between px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50"
            >
              PRODUCTOS
              <ChevronDown className={`size-4 transition-transform ${isMobileProductsOpen ? "rotate-180" : ""}`} />
            </button>
            {isMobileProductsOpen && (
              <div className="border-t border-slate-50 bg-slate-50 py-1">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/productos/${categorySlug(cat)}`}
                    onClick={closeMobileMenu}
                    className="block px-8 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    {cat}
                  </Link>
                ))}
                <Link
                  href="/productos"
                  onClick={closeMobileMenu}
                  className="block px-8 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-slate-900"
                >
                  Ver todos
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => goToSection("how-to-buy")}
            className="px-5 py-3 text-left text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            COMO COMPRAR
          </button>
          <button
            type="button"
            onClick={() => goToSection("about")}
            className="px-5 py-3 text-left text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            QUIENES SOMOS
          </button>
          <button
            type="button"
            onClick={() => goToSection("contact")}
            className="px-5 py-3 text-left text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            CONTACTO
          </button>
        </nav>
      </div>
    </>
  )
}
