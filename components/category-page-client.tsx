"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SlidersHorizontal, X } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { ProductCard, type ProductCardItem } from "@/components/product-card"
import { useCart } from "@/context/cart-context"

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

interface CategoryPageClientProps {
  category: string
  initialProducts: Product[]
  categories: string[]
}

const categorySlug = (category: string) => category.toLowerCase().replace(/\s+/g, "-")

const formatPrice = (n: number) =>
  `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]

// Mapa de colores en español → valor CSS para mostrar el punto de color
const COLOR_SWATCHES: Record<string, string> = {
  Negro: "#111827",
  Gris: "#9ca3af",
  Blanco: "#f3f4f6",
  Verde: "#16a34a",
  Beige: "#d2b48c",
  Azul: "#2563eb",
  Rojo: "#dc2626",
  Amarillo: "#ca8a04",
  Naranja: "#ea580c",
  Rosa: "#db2777",
  Violeta: "#7c3aed",
  Marrón: "#78350f",
  Marron: "#78350f",
  Celeste: "#0284c7",
  Bordo: "#881337",
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function calcMaxPrice(products: { price: number }[]): number {
  const max = products.reduce((m, p) => Math.max(m, p.price), 0)
  return Math.ceil(Math.max(max, 100000) / 10000) * 10000
}

export function CategoryPageClient({ category, initialProducts, categories }: CategoryPageClientProps) {
  const { addItem } = useCart()
  const [animatingButtons, setAnimatingButtons] = useState<Set<string>>(new Set())
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const computedMaxPrice = useMemo(() => calcMaxPrice(initialProducts), [initialProducts])
  const [maxPrice, setMaxPrice] = useState<number>(() => calcMaxPrice(initialProducts))

  // Solo muestra colores presentes en esta categoría
  const colors = useMemo(
    () => Array.from(new Set(initialProducts.flatMap((p) => p.colors))).sort(),
    [initialProducts]
  )

  // Cuenta filtros activos (no incluye la categoría porque es navegación, no filtro)
  const activeFilterCount = useMemo(() => {
    let n = selectedColors.size + selectedSizes.size
    if (maxPrice < computedMaxPrice) n++
    return n
  }, [selectedColors, selectedSizes, maxPrice, computedMaxPrice])

  const resetFilters = () => {
    setSelectedColors(new Set())
    setSelectedSizes(new Set())
    setMaxPrice(computedMaxPrice)
  }

  const filteredProducts = useMemo(() => {
    const colorsLower = new Set([...selectedColors].map(c => c.toLowerCase()))
    return initialProducts.filter((product) => {
      const matchColor = colorsLower.size === 0 || product.colors.some((c) => colorsLower.has(c.toLowerCase()))
      const matchSize = selectedSizes.size === 0 || product.sizes.some((s) => selectedSizes.has(s.toUpperCase()))
      const matchPrice = product.price <= maxPrice
      return matchColor && matchSize && matchPrice
    })
  }, [initialProducts, selectedColors, selectedSizes, maxPrice])

  const addToCart = (product: ProductCardItem) => {
    const full = initialProducts.find((p) => p.id === product.id)
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
    const buttonId = `add-${product.id}`
    setAnimatingButtons((prev) => new Set(prev).add(buttonId))
    setTimeout(() => {
      setAnimatingButtons((prev) => { const next = new Set(prev); next.delete(buttonId); return next })
    }, 400)
  }

  const renderFilterContent = () => (
    <div className="space-y-6">
      {/* Categorías — son links de navegación, no estado de filtro */}
      <div>
        <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-3">Categoría</p>
        <div className="grid gap-1.5">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/productos/${categorySlug(cat)}`}
              className={`text-left rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                cat === category
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Color — flex-wrap + punto de color real — solo colores de esta categoría */}
      {colors.length > 0 && (
        <div>
          <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-3">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColors((prev) => toggle(prev, color))}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                  selectedColors.has(color)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {COLOR_SWATCHES[color] && (
                  <span
                    className="shrink-0 rounded-full border border-black/10"
                    style={{ width: 10, height: 10, backgroundColor: COLOR_SWATCHES[color] }}
                  />
                )}
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Talle — flex-wrap con ancho mínimo para evitar celda vacía */}
      <div>
        <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-3">Talle</p>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSelectedSizes((prev) => toggle(prev, size))}
              className={`min-w-[2.75rem] rounded-xl px-3 py-2 text-center text-xs font-semibold transition-colors ${
                selectedSizes.has(size)
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Precio — con etiquetas mín/máx debajo del slider */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Precio máx.</span>
          <span className="text-xs font-black tracking-normal text-slate-900">{formatPrice(maxPrice)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={computedMaxPrice}
          step="1000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-slate-900"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
          <span>$ 0</span>
          <span>{formatPrice(computedMaxPrice)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200 selection:text-slate-900 pt-20">
      <Navbar />

      {/* Overlay fondo — drawer móvil */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 lg:hidden ${
          isFilterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsFilterOpen(false)}
      />

      {/* Drawer filtros móvil — 85% del ancho para pantallas pequeñas */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Filtros</p>
            {/* Botón limpiar solo aparece si hay filtros activos, con el contador */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-slate-700"
              >
                Limpiar · {activeFilterCount}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 transition"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{renderFilterContent()}</div>
        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white"
          >
            Ver {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:rounded-3xl sm:p-6">
          <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase">Categoría</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:mt-3 sm:text-5xl">{category}</h1>
          <p className="mt-2 max-w-2xl text-xs text-slate-600 sm:mt-3 sm:text-sm">
            Explorá los productos en {category.toLowerCase()} y ajustá color, talle y precio.
          </p>
        </div>

        {/* Barra superior móvil — botón cambia a negro cuando hay filtros activos */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-xs text-slate-500">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
          </p>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] shadow-sm transition ${
              activeFilterCount > 0
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
            {/* Badge numérico — visible solo cuando hay filtros activos */}
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-slate-900">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar escritorio — sticky para que no desaparezca al scrollear */}
          <aside className="hidden lg:block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm h-fit sticky top-20">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase">Filtros</p>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {/* Limpiar: deshabilitado visualmente cuando no hay filtros */}
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] transition ${
                  activeFilterCount > 0
                    ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700 cursor-pointer"
                    : "border-slate-200 bg-slate-50 text-slate-300 cursor-default"
                }`}
              >
                Limpiar
              </button>
            </div>
            {renderFilterContent()}
          </aside>

          <section>
            {/* Chips de filtros activos (desktop) — clickeables para quitar el filtro */}
            {activeFilterCount > 0 && (
              <div className="mb-4 hidden flex-wrap gap-2 lg:flex">
                {Array.from(selectedColors).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColors((prev) => toggle(prev, c))}
                    className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    {c} <X className="size-3" />
                  </button>
                ))}
                {Array.from(selectedSizes).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSizes((prev) => toggle(prev, s))}
                    className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    {s} <X className="size-3" />
                  </button>
                ))}
                {maxPrice < computedMaxPrice && (
                  <button
                    type="button"
                    onClick={() => setMaxPrice(computedMaxPrice)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Hasta {formatPrice(maxPrice)} <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {/* Contador sin filtros activos (desktop) */}
            {activeFilterCount === 0 && (
              <div className="mb-4 hidden lg:block">
                <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase">Resultados</p>
                <p className="mt-1 text-sm text-slate-600">
                  Mostrando {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Estado sin resultados — con botón de reset directo */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <p className="text-sm font-semibold text-slate-700 mb-1">Sin resultados</p>
                <p className="text-sm text-slate-400 mb-6">No hay productos con esa combinación de filtros.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-700 transition"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3 [&>*]:h-full">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    detailHref={`/productos/${categorySlug(product.category)}/${product.id}`}
                    onAddToCart={addToCart}
                    isAdding={animatingButtons.has(`add-${product.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
