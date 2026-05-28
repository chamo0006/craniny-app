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

const sizes = ["Xs", "S", "M", "L", "Xl", "Xxl", "Xxxl"]

export function CategoryPageClient({ category, initialProducts, categories }: CategoryPageClientProps) {
  const { addItem } = useCart()
  const [animatingButtons, setAnimatingButtons] = useState<Set<string>>(new Set())
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState<number>(500000)

  const colors = useMemo(
    () => Array.from(new Set(initialProducts.flatMap((p) => p.colors))).sort(),
    [initialProducts]
  )

  const resetFilters = () => {
    setSelectedColor(null)
    setSelectedSize(null)
    setMaxPrice(500000)
  }

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const matchColor = !selectedColor || product.colors.includes(selectedColor)
      const matchSize = !selectedSize || product.sizes.includes(selectedSize)
      const matchPrice = product.price <= maxPrice
      return matchColor && matchSize && matchPrice
    })
  }, [initialProducts, selectedColor, selectedSize, maxPrice])

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

  const filterContent = (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-3">Categoría</p>
        <div className="grid gap-2">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/productos/${categorySlug(cat)}`}
              className={`text-left rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
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

      {colors.length > 0 && (
        <div>
          <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-3">Color</p>
          <div className="grid grid-cols-3 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                  selectedColor === color
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-3">Talle</p>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSelectedSize(selectedSize === size ? null : size)}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                selectedSize === size
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Precio máximo</span>
          <span className="text-xs font-black tracking-normal text-slate-900">{formatPrice(maxPrice)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="500000"
          step="1000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-slate-900"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200 selection:text-slate-900 pt-20">
      <Navbar />

      {/* Mobile filter drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 lg:hidden ${
          isFilterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsFilterOpen(false)}
      />
      {/* Mobile filter drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[80%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Filtros</p>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-100"
            >
              Limpiar
            </button>
          </div>
          <button type="button" onClick={() => setIsFilterOpen(false)}>
            <X className="size-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{filterContent}</div>
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

        {/* Mobile: filter button */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-xs text-slate-500">{filteredProducts.length} productos</p>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase">Filtros</p>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Limpiar
              </button>
            </div>
            {filterContent}
          </aside>

          <section>
            <div className="mb-4 hidden items-center justify-between lg:flex">
              <div>
                <p className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase">Resultados</p>
                <p className="mt-1 text-sm text-slate-600">Mostrando {filteredProducts.length} productos</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                {selectedColor && <span className="rounded-full bg-slate-100 px-3 py-2">{selectedColor}</span>}
                {selectedSize && <span className="rounded-full bg-slate-100 px-3 py-2">{selectedSize}</span>}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-500">
                No hay productos con esos filtros. Probá otra combinación.
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
