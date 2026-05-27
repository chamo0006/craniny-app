"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
    <Card className="group flex h-full flex-col overflow-hidden border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-0">
        <Link
          href={detailHref}
          className="relative block aspect-[4/5] shrink-0 overflow-hidden bg-slate-100"
          aria-label={`Ver ${product.name}`}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        </Link>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-1 flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">{product.category}</p>
            <p className="mt-1 text-xs text-slate-500">{inStock ? `${product.stock} en stock` : "Agotado"}</p>
            <Link href={detailHref} className="mt-3 block min-h-[3.25rem]">
              <h3 className="line-clamp-2 text-lg font-black leading-tight text-slate-900 transition-colors group-hover:text-slate-700">
                {product.name}
              </h3>
            </Link>
            <p className="mt-3 text-base font-black text-slate-900">{formatPrice(product.price)}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-10 w-full rounded-lg border-slate-300 text-xs font-bold">
              <Link href={detailHref}>Ver producto</Link>
            </Button>
            {onAddToCart ? (
              <Button
                type="button"
                disabled={!inStock}
                onClick={() => onAddToCart(product)}
                className={`h-10 w-full rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 ${
                  isAdding ? "scale-95 animate-pulse" : ""
                }`}
              >
                Agregar
              </Button>
            ) : (
              <Button asChild className="h-10 w-full rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800">
                <Link href={detailHref}>Comprar</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
