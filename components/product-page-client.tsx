"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import type { ProductDetail, Variant } from "@/lib/products"
import { useCart } from "@/context/cart-context"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`

const categorySlug = (cat: string) => cat.toLowerCase().replace(/\s+/g, "-")

function variantStock(variants: Variant[], size: string, color: string): number {
  const exact = variants.find((v) => v.talle === size && v.color === color)
  if (exact) return exact.stock
  return variants.find((v) => v.talle === size)?.stock ?? 0
}

function colorPreviewImage(variants: Variant[], color: string): string | null {
  return variants.find((v) => v.color === color && v.imagen_url)?.imagen_url ?? null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductPageClient({ product }: { product: ProductDetail }) {
  const variants = product.variants
  const { addItem } = useCart()

  // pick first available color/size
  const initialColor =
    product.colors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) ||
    product.colors[0] ||
    ""
  const initialSize =
    product.sizes.find((s) => variantStock(variants, s, initialColor) > 0) ||
    product.sizes[0] ||
    ""

  const [selectedColor, setSelectedColor] = useState(initialColor)
  const [selectedSize, setSelectedSize] = useState(initialSize)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [discountType, setDiscountType] = useState<"transferencia" | "efectivo">("transferencia")
  const [discountPercent, setDiscountPercent] = useState(20)
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(180000)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        const override = s.products?.[String(product.id)] ?? {}
        setDiscountType(override.discountType ?? s.defaultDiscountType ?? "transferencia")
        setDiscountPercent(override.discountPercent ?? s.defaultDiscountPercent ?? 20)
        setFreeShipping(override.freeShipping ?? false)
        setFreeShippingThreshold(s.freeShippingThreshold ?? 180000)
      })
      .catch(() => {})
  }, [product.id])

  const galleryImages = useMemo(() => {
    // Use the product-level gallery if it was explicitly set via admin (imagenes array)
    if (product.galleryImages && product.galleryImages.length > 0) {
      const list = product.galleryImages
      return list.includes(product.image) ? list : [product.image, ...list]
    }
    const fromVariants = Array.from(
      new Set(
        variants.map((v) => v.imagen_url).filter((u): u is string => Boolean(u))
      )
    )
    const list = fromVariants.length > 0 ? fromVariants : [product.image]
    return list.includes(product.image) ? list : [product.image, ...list]
  }, [variants, product.image, product.galleryImages])

  const stock = useMemo(
    () => variantStock(variants, selectedSize, selectedColor),
    [variants, selectedSize, selectedColor]
  )
  const isOutOfStock = stock === 0
  const isLowStock = stock > 0 && stock <= 5

  const transferPrice = Math.round(product.price * (1 - discountPercent / 100))

  // clamp quantity if stock changes
  useEffect(() => {
    if (quantity > stock && stock > 0) setQuantity(stock)
  }, [stock, quantity])

  // follow color image in gallery
  useEffect(() => {
    const img = variants.find((v) => v.color === selectedColor && v.imagen_url)?.imagen_url
    if (img) {
      const idx = galleryImages.indexOf(img)
      if (idx >= 0) setActiveImage(idx)
    }
  }, [selectedColor, variants, galleryImages])

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        image: galleryImages[0] ?? product.image,
        selectedColor,
        selectedSize,
        maxStock: stock,
      },
      quantity
    )
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
    setQuantity(1)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main className="pb-20 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* ── Breadcrumbs ── */}
          <nav className="flex flex-wrap items-center gap-1 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            <Link href="/" className="transition hover:text-slate-700">
              Inicio
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
            <Link
              href={`/productos/${categorySlug(product.category)}`}
              className="transition hover:text-slate-700"
            >
              {product.category.toUpperCase()}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
            <span className="text-slate-700">{product.name.toUpperCase()}</span>
          </nav>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px] lg:items-start">

            {/* ── Galería: imagen principal + tiras de miniaturas ── */}
            <div className="flex flex-col gap-3">

              {/* Imagen principal */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                <Image
                  src={galleryImages[activeImage] ?? product.image}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover transition-opacity duration-300"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
                {galleryImages.length > 1 && (
                  <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    {activeImage + 1} / {galleryImages.length}
                  </span>
                )}
                {isLowStock && (
                  <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900">
                    ¡Últimas {stock} unidades!
                  </span>
                )}
              </div>

              {/* Tira de miniaturas — scroll horizontal, siempre visible */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {galleryImages.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        activeImage === i
                          ? "border-slate-900"
                          : "border-slate-200 opacity-60 hover:border-slate-400 hover:opacity-100"
                      }`}
                    >
                      <Image src={src} alt="" fill className="object-cover" sizes="60px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Ficha comercial ── */}
            <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">

              {/* Título */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                  {product.category}
                </p>
                <h1 className="mt-1.5 text-2xl font-black uppercase leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  {product.name}
                </h1>
              </div>

              {/* Precios */}
              <div className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-400 line-through">{fmt(product.price)}</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-black text-red-600">{fmt(transferPrice)}</span>
                  <span className="text-sm font-bold text-red-500">con {discountType === "transferencia" ? "Transferencia" : "Efectivo"}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ahorrás {fmt(product.price - transferPrice)} pagando con {discountType === "transferencia" ? "transferencia bancaria" : "efectivo"}
                </p>
              </div>

              {/* Envío gratis */}
              {freeShipping ? (
                <div className="flex items-center gap-2.5">
                  <Truck className="h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-600">¡Envío gratis en este producto!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Truck className="h-5 w-5 shrink-0 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Envío gratis superando los{" "}
                    <span className="font-semibold">
                      ${new Intl.NumberFormat("es-AR").format(freeShippingThreshold)}
                    </span>
                  </p>
                </div>
              )}

              {/* Stock status */}
              {(isOutOfStock || isLowStock) && (
                <div
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                    isOutOfStock
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {isOutOfStock
                    ? `Agotado en talle ${selectedSize} / ${selectedColor}`
                    : `¡Solo quedan ${stock} en talle ${selectedSize} / ${selectedColor}!`}
                </div>
              )}

              {/* Selector de Talle */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-slate-900">
                  Talle:{" "}
                  <span className="font-normal text-slate-600">{selectedSize}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    const hasStock = variantStock(variants, size, selectedColor) > 0
                    const active = selectedSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!hasStock}
                        onClick={() => setSelectedSize(size)}
                        className={`flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border-2 px-3 text-sm font-bold transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : hasStock
                            ? "border-slate-300 bg-white text-slate-900 hover:border-slate-700"
                            : "cursor-not-allowed border-slate-100 text-slate-300 line-through"
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selector de Color */}
              <div>
                <p className="mb-2.5 text-sm font-bold text-slate-900">
                  Color:{" "}
                  <span className="font-normal text-slate-600">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const available = product.sizes.some(
                      (s) => variantStock(variants, s, color) > 0
                    )
                    const preview = colorPreviewImage(variants, color)
                    const active = selectedColor === color

                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          setSelectedColor(color)
                          if (variantStock(variants, selectedSize, color) === 0) {
                            const next = product.sizes.find(
                              (s) => variantStock(variants, s, color) > 0
                            )
                            if (next) setSelectedSize(next)
                          }
                        }}
                        title={color}
                        className={`relative overflow-hidden rounded-xl border-2 transition ${
                          active
                            ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1"
                            : available
                            ? "border-slate-200 hover:border-slate-500"
                            : "cursor-not-allowed border-slate-100 opacity-40"
                        } ${preview ? "h-14 w-14" : "h-9 min-w-[3.5rem] px-3"}`}
                      >
                        {preview ? (
                          <>
                            <Image
                              src={preview}
                              alt={color}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                            {active && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Check className="h-4 w-4 text-white" />
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">{color}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cantidad + Agregar al carrito */}
              <div className="flex items-stretch gap-3">
                <div className="flex items-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isOutOfStock}
                    className="flex h-12 w-11 items-center justify-center transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4 text-slate-700" />
                  </button>
                  <span className="w-10 select-none text-center text-base font-black text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    disabled={isOutOfStock || quantity >= stock}
                    className="flex h-12 w-11 items-center justify-center transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4 text-slate-700" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-widest transition active:scale-[0.98] ${
                    addedToCart
                      ? "bg-emerald-500 text-white"
                      : isOutOfStock
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <Check className="h-4 w-4" />
                      Agregado
                    </>
                  ) : isOutOfStock ? (
                    "Agotado"
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      Agregar al carrito
                    </>
                  )}
                </button>
              </div>

              {/* Política de cambios */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <RefreshCw className="h-4 w-4 shrink-0 text-slate-500" />
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Cambios de talle</span>
                  {" — "}Si no te quedó, podés cambiarlo sin problema.
                </p>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                Al finalizar, coordinás envío y pago con CRANINY por WhatsApp.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
