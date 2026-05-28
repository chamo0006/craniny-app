"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export interface ProductCardItem {
  id: number
  name: string
  price: number
  category: string
  image: string
  stock?: number
}

interface ProductCardProps {
  product: ProductCardItem
  detailHref: string
  onAddToCart?: (product: ProductCardItem) => void
  isAdding?: boolean
}

const formatPrice = (price: number) =>
  `$ ${new Intl.NumberFormat("es-AR").format(Math.round(price))}`

export function ProductCard({ product, detailHref, onAddToCart, isAdding }: ProductCardProps) {
  const inStock = (product.stock ?? 0) > 0

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white transition hover:border-slate-300 hover:shadow-md">
      <Link
        href={detailHref}
        className="relative block aspect-[3/4] shrink-0 overflow-hidden bg-slate-100"
        aria-label={`Ver ${product.name}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-700">
              Agotado
            </span>
          </div>
        )}
      </Link>

      {/* Content: flex-1 + flex-col to push buttons to the bottom */}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">
            {product.category}
          </p>
          <Link href={detailHref}>
            <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-slate-700 sm:text-sm">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-sm font-black text-slate-900">{formatPrice(product.price)}</p>
        </div>

        {/* Buttons always at the bottom of the card */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Button
            asChild
            variant="outline"
            className="h-8 w-full rounded-lg border-slate-200 text-[10px] font-bold"
          >
            <Link href={detailHref}>Ver</Link>
          </Button>
          {onAddToCart ? (
            <Button
              type="button"
              disabled={!inStock}
              onClick={() => onAddToCart(product)}
              className={`h-8 w-full rounded-lg bg-slate-900 text-[10px] font-bold text-white hover:bg-slate-800 ${
                isAdding ? "scale-95 animate-pulse" : ""
              }`}
            >
              Agregar
            </Button>
          ) : (
            <Button
              asChild
              className="h-8 w-full rounded-lg bg-slate-900 text-[10px] font-bold text-white hover:bg-slate-800"
            >
              <Link href={detailHref}>Comprar</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
