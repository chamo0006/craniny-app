"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingBag, Menu, Video, Instagram, MessageCircle, Mail, Music } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
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
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products)) {
          setProducts(
            data.products.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              category: p.category,
              colors: p.colors ?? [],
              sizes: p.sizes ?? [],
              image: p.image,
              stock: p.stock ?? 0,
            }))
          )
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

  const addToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      selectedColor: product.colors[0] ?? "",
      selectedSize: product.sizes[0] ?? "",
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
          <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-900 transition-opacity hover:opacity-70 md:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="size-6" />
              </button>
              <Logo onClick={resetFilters} />
            </div>

            <nav className="hidden justify-center gap-10 md:flex">
              <Link
                href="/"
                className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900"
              >
                INICIO
              </Link>

              <Link
                href="/productos"
                className="flex items-center gap-1 text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900"
              >
                PRODUCTOS
              </Link>

              <Link href="/#how-to-buy" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">COMO COMPRAR</Link>
              <Link href="/#about" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">QUIENES SOMOS</Link>
              <Link href="/#contact" className="text-sm font-semibold tracking-[0.2em] text-slate-700 transition-colors hover:text-slate-900">CONTACTO</Link>
            </nav>

            <div className="flex items-center justify-end gap-3 pr-2">
              {/* LOGIN — habilitarlo cuando esté listo
              <Link href="/login" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
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
                  <Badge className="absolute -top-2 -right-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-900">
                    {count}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Menú Desplegable Celular */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden animate-in fade-in duration-200">
            <nav className="flex flex-col gap-2">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-left py-2.5 text-sm font-bold tracking-wider text-slate-700">INICIO</Link>
              <Link href="/productos" onClick={() => setIsMobileMenuOpen(false)} className="text-left py-2.5 text-sm font-bold tracking-wider text-slate-700">PRODUCTOS</Link>
              <Link href="/#how-to-buy" onClick={() => setIsMobileMenuOpen(false)} className="py-2.5 text-sm font-bold text-slate-700">COMO COMPRAR</Link>
              <Link href="/#about" onClick={() => setIsMobileMenuOpen(false)} className="py-2.5 text-sm font-bold text-slate-700">QUIENES SOMOS</Link>
              <Link href="/#contact" onClick={() => setIsMobileMenuOpen(false)} className="py-2.5 text-sm font-bold text-slate-700">CONTACTO</Link>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-2.5 text-sm font-bold text-slate-900">LOGIN</Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden pt-16 bg-slate-100">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1920&h=1080&fit=crop"
            alt="Urban streetwear background"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-white to-slate-100" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-xs font-black tracking-[0.5em] text-slate-500">CRANINY DROP 2026</p>
          <h2 className="mb-6 text-5xl font-black tracking-tighter text-slate-900 sm:text-7xl lg:text-8xl">
            OWN THE STREETS
          </h2>
          <Link
            href="/productos"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-sm font-black tracking-widest text-white transition hover:bg-slate-800"
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <Card key={product.id} className={`group overflow-hidden border border-slate-200 hover:border-slate-300 transition transform hover:-translate-y-1 hover:shadow-lg`}>
                <Link href={`/productos/${categorySlug(product.category)}/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-slate-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <Badge className="absolute top-3 left-3 bg-slate-950 text-white font-bold">
                    {product.category}
                  </Badge>
                </Link>
                <CardContent className="p-4">
                  <h4 className="mb-2 font-bold text-slate-900 text-sm line-clamp-2">{product.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900">{formatPrice(product.price)}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className={`rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 ${animatingButtons.has(`add-${product.id}`) ? 'scale-95 animate-pulse' : ''}`}
                    >
                      Agregar
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN PRINCIPAL: FILTROS + PRODUCTOS */}
      <section id="collections" className="py-12 border-t border-slate-200 bg-slate-50">


      </section>

      {/* SECCIÓN CÓMO COMPRAR (CON CAMPO PARA VIDEO FUTURO) */}
      <section id="how-to-buy" className="py-20 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-2">Guía del Cliente</p>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 mb-6">¿CÓMO COMPRAR EN CRANINY?</h3>
          
          {/* Contenedor de video a futuro */}
          <div className="relative w-full aspect-video rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 group overflow-hidden shadow-2xl mb-8">
            <div className="absolute inset-0 bg-slate-900/10 opacity-50 pointer-events-none" />
            <Video className="size-12 text-slate-700 mb-3 transition-colors duration-300" />
            <h4 className="text-sm font-bold text-slate-600 tracking-wide uppercase">Espacio para Video Explicativo</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">Acá se insertará el video instructivo a futuro para que tus clientes vean el proceso de compra dinámico.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left mt-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono text-slate-500 font-bold block mb-1">01.</span>
              <h5 className="text-xs font-bold uppercase mb-1 text-slate-900">Elegí tu Drop</h5>
              <p className="text-xs text-slate-500">Navegá, filtrá por talle y color, y agregá tus prendas favoritas al carrito urbano.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono text-slate-500 font-bold block mb-1">02.</span>
              <h5 className="text-xs font-bold uppercase mb-1 text-slate-900">Revisá el Carrito</h5>
              <p className="text-xs text-slate-500">Confirmá que las cantidades y productos seleccionados sean correctos antes de avanzar.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono text-slate-500 font-bold block mb-1">03.</span>
              <h5 className="text-xs font-bold uppercase mb-1 text-slate-900">Despachá al WhatsApp</h5>
              <p className="text-xs text-slate-500">El botón genera la orden automática y se la manda a Valen para coordinar stock y pagos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN QUIÉNES SOMOS */}
      <section id="about" className="border-t border-slate-200 py-20 sm:py-28 bg-slate-50">
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
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop"
                alt="Model wearing CRANINY streetwear"
                fill
                className="object-cover filter grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN CONTACTO */}
      <section id="contact" className="border-t border-slate-200 py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-black tracking-[0.3em] text-slate-500 uppercase mb-2">Soporte</p>
          <h3 className="text-2xl font-black text-slate-900 uppercase mb-8">CANALES DE CONTACTO</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="https://instagram.com/craniny.ar" target="_blank" className="flex flex-col items-center p-5 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <Instagram className="size-6 text-slate-500 mb-2" />
              <span className="text-xs font-bold uppercase text-slate-900">Instagram</span>
              <span className="text-[11px] text-slate-500 mt-1">@craniny.ar</span>
            </a>
            <a href="https://wa.me/5491121615661" target="_blank" className="flex flex-col items-center p-5 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <MessageCircle className="size-6 text-slate-500 mb-2" />
              <span className="text-xs font-bold uppercase text-slate-900">WhatsApp</span>
              <span className="text-[11px] text-slate-500 mt-1">+54 9 11 216-15661</span>
            </a>
            <a href="https://tiktok.com/@craniny.ar" target="_blank" className="flex flex-col items-center p-5 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
              <Music className="size-6 text-slate-500 mb-2" />
              <span className="text-xs font-bold uppercase text-slate-900">TikTok</span>
              <span className="text-[11px] text-slate-500 mt-1">@craniny.ar</span>
            </a>
            <a href="mailto:info@craniny.com" className="flex flex-col items-center p-5 border border-slate-200 rounded-xl bg-slate-50 hover:border-slate-300 transition">
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
        className="fixed bottom-8 right-8 size-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-50"
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