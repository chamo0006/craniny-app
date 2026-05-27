"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Menu, ChevronDown, ShoppingBag } from "lucide-react"
import { Logo } from "@/components/logo"
import { useCart } from "@/context/cart-context"

const DEFAULT_CATEGORIES = ["Buzos", "Remeras", "Pantalones", "Camperas", "Bermudas", "Gorras"]
const categorySlug = (category: string) => category.toLowerCase().replace(/\s+/g, "-")

const navLinkClass =
  "text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900 whitespace-nowrap"

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const { openCart, count } = useCart()
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProductsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-900 transition-opacity hover:opacity-70 md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-6" />
            </button>
            <Logo />
          </div>

          <nav className="hidden items-center justify-center gap-6 lg:gap-10 md:flex">
            <Link href="/" className={navLinkClass}>
              INICIO
            </Link>

            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                className={`flex items-center gap-1 ${navLinkClass}`}
                aria-expanded={isProductsDropdownOpen}
                aria-haspopup="true"
              >
                PRODUCTOS
                <ChevronDown
                  className={`size-4 transition-transform ${isProductsDropdownOpen ? "rotate-180" : ""}`}
                />
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

            <Link href="/#how-to-buy" className={navLinkClass}>
              COMO COMPRAR
            </Link>
            <Link href="/#about" className={navLinkClass}>
              QUIENES SOMOS
            </Link>
            <Link href="/#contact" className={navLinkClass}>
              CONTACTO
            </Link>
          </nav>

          <div className="flex items-center justify-end gap-3">
            {/* LOGIN — habilitarlo cuando esté listo
            <Link
              href="/login"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 md:inline-flex"
            >
              LOGIN
            </Link>
            */}
            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-white transition hover:bg-slate-800"
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

      {isMobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2.5 text-sm font-bold tracking-wider text-slate-700"
            >
              INICIO
            </Link>

            <div className="border-t border-slate-100 py-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Productos</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/productos/${categorySlug(cat)}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg bg-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-200"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
              <Link
                href="/productos"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-2 block py-2 text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Ver todos los productos
              </Link>
            </div>

            <Link
              href="/#how-to-buy"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2.5 text-sm font-bold text-slate-700"
            >
              COMO COMPRAR
            </Link>
            <Link
              href="/#about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2.5 text-sm font-bold text-slate-700"
            >
              QUIENES SOMOS
            </Link>
            <Link
              href="/#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2.5 text-sm font-bold text-slate-700"
            >
              CONTACTO
            </Link>
            {/* LOGIN mobile — habilitarlo cuando esté listo
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-2.5 text-sm font-bold text-slate-900">LOGIN</Link>
            */}
          </nav>
        </div>
      )}
    </header>
  )
}
