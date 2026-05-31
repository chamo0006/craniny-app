"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingBag, Menu, X, MessageCircle, Mail, Music } from "lucide-react"
import { Logo } from "@/components/logo"
import { ProductCard, type ProductCardItem } from "@/components/product-card"
import { useCart } from "@/context/cart-context"

// Interfaz extendida para soportar filtros de talles y colores
interface Product {
  id: number
  name: string
  price: number
  category: string
  colors: string[]
  sizes: string[]
  image: string
  stock?: number
}

const categories = ["Remeras", "Pantalones", "Camperas", "Bermudas", "Gorras"]

const colors = ["Negro", "Gris", "Blanco", "Verde", "Beige", "Azul", "Rojo"]
const sizes = ["Xs", "S", "M", "L", "Xl", "Xxl", "Xxxl"]

const categorySlug = (category: string) => category.toLowerCase().replace(/\s+/g, "-")

const formatPrice = (price: number) =>
  `$ ${new Intl.NumberFormat("es-AR").format(Math.round(price))}`

export default function CraninyStore() {
  const { addItem, openCart, count } = useCart()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [animatingButtons, setAnimatingButtons] = useState<Set<string>>(new Set())
  const [products, setProducts] = useState<Product[]>([])

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState<number>(500000)

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isMobileMenuOpen])

  // After React hydration, re-scroll to hash if present (hydration can reset scroll position)
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products)) {
          const mapped = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            colors: p.colors ?? [],
            sizes: p.sizes ?? [],
            image: p.image,
            stock: p.stock ?? 0,
          }))
          // Shuffle so the preview grid shows different products on each visit
          for (let i = mapped.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mapped[i], mapped[j]] = [mapped[j], mapped[i]]
          }
          setProducts(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const resetFilters = () => {
    setSelectedCategory(null)
    setSelectedColor(null)
    setSelectedSize(null)
    setMaxPrice(70000)
    setIsMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory = !selectedCategory || product.category === selectedCategory
      const matchColor = !selectedColor || product.colors.includes(selectedColor)
      const matchSize = !selectedSize || product.sizes.includes(selectedSize)
      const matchPrice = product.price <= maxPrice
      return matchCategory && matchColor && matchSize && matchPrice
    })
  }, [selectedCategory, selectedColor, selectedSize, maxPrice])

  const addToCart = (product: ProductCardItem) => {
    const full = products.find((p) => p.id === product.id)
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      selectedColor: full?.colors[0] ?? "",
      selectedSize: full?.sizes[0] ?? "",
      maxStock: product.stock ?? 99,
    })
    const id = `add-${product.id}`
    setAnimatingButtons((prev) => new Set(prev).add(id))
    setTimeout(() => setAnimatingButtons((prev) => { const next = new Set(prev); next.delete(id); return next }), 450)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      {/* HEADER / NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl text-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8">
            {/* Columna izquierda: hamburger (mobile) + logo (desktop) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-900 transition-opacity hover:opacity-70 md:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="size-6" />
              </button>
              <div className="hidden md:block">
                <Logo onClick={resetFilters} />
              </div>
            </div>

            {/* Columna central: logo centrado (mobile) | nav (desktop) */}
            <div className="flex items-center justify-center">
              <div className="md:hidden">
                <Logo onClick={resetFilters} />
              </div>
              <nav className="hidden items-center justify-center gap-10 md:flex">
                <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">INICIO</Link>
                <Link href="/productos" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">PRODUCTOS</Link>
                <Link href="/#how-to-buy" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">COMO COMPRAR</Link>
                <Link href="/#about" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">QUIENES SOMOS</Link>
                <Link href="/#contact" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">CONTACTO</Link>
              </nav>
            </div>

            {/* Columna derecha: carrito */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-white transition hover:bg-slate-800 md:h-12 md:w-12"
                aria-label="Abrir carrito"
              >
                <ShoppingBag className="size-5" />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-900">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }}
      />

      {/* Mobile slide-in drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[72%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <Logo onClick={() => { document.body.style.overflow = ""; resetFilters() }} />
          <button
            type="button"
            onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto py-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
          <Link href="/" onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }} className="px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50">INICIO</Link>
          <Link href="/productos" onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }} className="px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50">PRODUCTOS</Link>
          <Link href="/#how-to-buy" onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }} className="px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50">COMO COMPRAR</Link>
          <Link href="/#about" onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }} className="px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50">QUIENES SOMOS</Link>
          <Link href="/#contact" onClick={() => { document.body.style.overflow = ""; setIsMobileMenuOpen(false) }} className="px-5 py-3 text-sm font-bold tracking-wider text-slate-700 transition hover:bg-slate-50">CONTACTO</Link>
        </nav>
      </div>

      {/* HERO SECTION */}
      <section className="relative flex min-h-[60vh] sm:min-h-[85vh] items-center justify-center overflow-hidden pt-16 bg-black">
        <div className="absolute inset-0">
          <Image
            src="/fondo-craniny.png"
            alt="Urban streetwear background"
            fill
            className="object-cover object-center opacity-100"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/45 sm:bg-black/40" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-[10px] sm:text-xs font-black tracking-[0.4em] sm:tracking-[0.5em] text-white/70">CRANINY DROP 2026</p>
          <h2 className="mb-5 sm:mb-6 text-4xl font-black tracking-tighter text-white sm:text-7xl lg:text-8xl">
            OWN THE STREETS
          </h2>
          <Link
            href="/productos"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-black tracking-widest text-slate-900 transition hover:bg-slate-100"
          >
            VER CATÁLOGO
          </Link>
        </div>
      </section>

      {/* SECCIÓN PRODUCTOS - APARTADO DESTACADO */}
      <section className="py-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-black tracking-[0.5em] text-slate-500">DESCUBRE NUESTRAS PRENDAS</p>
            <h3 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              PRODUCTOS
            </h3>
            <p className="mb-8 text-slate-600 max-w-2xl mx-auto">
              Explora nuestra colección completa de streetwear. Desde buzos oversized hasta accesorios únicos, encuentra tu estilo.
            </p>
            <button
              onClick={() => document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-black tracking-widest text-white transition hover:bg-slate-800"
            >
              VER TODOS LOS PRODUCTOS
            </button>
          </div>

          {/* GRILLA PREVIEW DE PRODUCTOS */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                detailHref={`/productos/${categorySlug(product.category)}/${product.id}`}
                onAddToCart={addToCart}
                isAdding={animatingButtons.has(`add-${product.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN PRINCIPAL: FILTROS + PRODUCTOS */}
      <section id="collections" className="py-12 border-t border-slate-200 bg-slate-50">


      </section>

      {/* SECCIÓN CÓMO COMPRAR */}
      <section id="how-to-buy" className="scroll-mt-16 py-24 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="mb-2 text-xs font-black tracking-[0.4em] text-slate-500 uppercase">Guía del Cliente</p>
            <h3 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">¿CÓMO COMPRAR EN CRANINY?</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-5xl font-black text-slate-200 mb-4 leading-none">01</span>
              <h5 className="text-base font-black uppercase tracking-wide text-slate-900 mb-3">Elegí tu Drop</h5>
              <p className="text-sm text-slate-500 leading-relaxed">Navegá, filtrá por talle y color, y agregá tus prendas favoritas al carrito.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-5xl font-black text-white/20 mb-4 leading-none">02</span>
              <h5 className="text-base font-black uppercase tracking-wide text-white mb-3">Revisá el Carrito</h5>
              <p className="text-sm text-slate-400 leading-relaxed">Confirmá que las cantidades y productos seleccionados sean correctos antes de avanzar.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-5xl font-black text-slate-200 mb-4 leading-none">03</span>
              <h5 className="text-base font-black uppercase tracking-wide text-slate-900 mb-3">Despachá al WhatsApp</h5>
              <p className="text-sm text-slate-500 leading-relaxed">El botón genera la orden automática y la manda a Valen para coordinar stock y pago.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN QUIÉNES SOMOS */}
      <section id="about" className="scroll-mt-16 border-t border-slate-200 py-20 sm:py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-2 text-xs font-black tracking-[0.3em] text-slate-500 uppercase">La Cultura</p>
              <h3 className="mb-6 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl uppercase">
                QUIENES SOMOS
              </h3>
              <p className="mb-4 text-sm text-slate-600 leading-relaxed">
                CRANINY nace de la búsqueda de prendas cómodas, versátiles y con identidad.
              </p>
              <p className="mb-4 text-sm text-slate-600 leading-relaxed">
                Diseñamos ropa pensada para el día a día, combinando estética urbana, calidad y simplicidad.
              </p>
              <p className="mb-4 text-sm text-slate-600 leading-relaxed">
                Cada producto está desarrollado buscando buen calce, materiales cómodos y una imagen limpia que puedas usar en cualquier momento.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Somos una marca independiente de Buenos Aires creada por Valentín Motzo.
              </p>
            </div>
            <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <Image
                src="/images/products/foto%20del%20quienes%20somos.jpg"
                alt="Craniny streetwear"
                fill
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN CONTACTO */}
      <section id="contact" className="scroll-mt-16 border-t border-slate-200 py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-black tracking-[0.3em] text-slate-500 uppercase mb-2">Soporte</p>
          <h3 className="text-2xl font-black text-slate-900 uppercase mb-8">CANALES DE CONTACTO</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="https://instagram.com/craniny.ar" target="_blank" className="flex flex-col items-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <svg className="size-6 text-slate-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.1" fill="currentColor" strokeWidth="3"/>
              </svg>
              <span className="text-xs font-bold uppercase text-slate-900">Instagram</span>
              <span className="text-[11px] text-slate-500 mt-1">@craniny.ar</span>
            </a>
            <a href="https://wa.me/5491121615661" target="_blank" className="flex flex-col items-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <MessageCircle className="size-6 text-slate-500 mb-2" />
              <span className="text-xs font-bold uppercase text-slate-900">WhatsApp</span>
              <span className="text-[11px] text-slate-500 mt-1">+54 9 11 2161-5661</span>
            </a>
            <a href="https://tiktok.com/@craniny.ar" target="_blank" className="flex flex-col items-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <Music className="size-6 text-slate-500 mb-2" />
              <span className="text-xs font-bold uppercase text-slate-900">TikTok</span>
              <span className="text-[11px] text-slate-500 mt-1">@craniny.ar</span>
            </a>
            <a href="mailto:contacto@craniny.com" className="flex flex-col items-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <Mail className="size-6 text-slate-500 mb-2" />
              <span className="text-xs font-bold uppercase text-slate-900">Email</span>
              <span className="text-[11px] text-slate-500 mt-1">contacto@craniny.com</span>
            </a>
          </div>
        </div>
      </section>

      {/* BOTÓN FLOTANTE WHATSAPP */}
      <a
        href="https://wa.me/5491121615661"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-4 size-13 sm:bottom-8 sm:right-8 sm:size-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-50"
        title="Contactanos por WhatsApp"
      >
        <MessageCircle className="size-7" />
      </a>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-12 bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-base font-black tracking-[0.4em] text-slate-900 uppercase mb-4">CRANINY</h2>
          <p className="text-[11px] text-slate-500 font-mono">
            © 2026 CRANINY. Hecho en Argentina. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}