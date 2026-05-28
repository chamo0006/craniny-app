"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import Image from "next/image"
import { ShoppingBag, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  id: number
  name: string
  price: number
  category: string
  image: string
  quantity: number
  selectedColor: string
  selectedSize: string
  maxStock: number
}

type CartContextType = {
  items: CartItem[]
  isOpen: boolean
  total: number
  transferTotal: number
  count: number
  addItem: (product: Omit<CartItem, "quantity">, qty?: number) => void
  removeItem: (id: number, color: string, size: string) => void
  updateQty: (id: number, color: string, size: string, qty: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | null>(null)

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`

const STORAGE_KEY = "craniny_cart_v1"

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [discountType, setDiscountType] = useState<"transferencia" | "efectivo">("transferencia")
  const [discountPercent, setDiscountPercent] = useState(20)

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw) as CartItem[])
    } catch {}
  }, [])

  // Load global discount settings
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.defaultDiscountType) setDiscountType(d.defaultDiscountType)
        if (typeof d.defaultDiscountPercent === "number") setDiscountPercent(d.defaultDiscountPercent)
      })
      .catch(() => {})
  }, [])

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const total = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  )
  const transferTotal = useMemo(
    () => Math.round(total * (1 - discountPercent / 100)),
    [total, discountPercent]
  )
  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  )

  const addItem = useCallback(
    (product: Omit<CartItem, "quantity">, qty = 1) => {
      const cap = product.maxStock ?? 99
      setItems((prev) => {
        const match = prev.find(
          (i) =>
            i.id === product.id &&
            i.selectedColor === product.selectedColor &&
            i.selectedSize === product.selectedSize
        )
        if (match) {
          const newQty = Math.min(match.quantity + qty, cap)
          if (newQty === match.quantity) return prev
          return prev.map((i) =>
            i.id === product.id &&
            i.selectedColor === product.selectedColor &&
            i.selectedSize === product.selectedSize
              ? { ...i, quantity: newQty, maxStock: cap }
              : i
          )
        }
        return [...prev, { ...product, quantity: Math.min(qty, cap) }]
      })
      setIsOpen(true)
    },
    []
  )

  const removeItem = useCallback((id: number, color: string, size: string) => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          !(i.id === id && i.selectedColor === color && i.selectedSize === size)
      )
    )
  }, [])

  const updateQty = useCallback(
    (id: number, color: string, size: string, qty: number) => {
      if (qty <= 0) {
        setItems((prev) =>
          prev.filter(
            (i) =>
              !(
                i.id === id &&
                i.selectedColor === color &&
                i.selectedSize === size
              )
          )
        )
        return
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === id && i.selectedColor === color && i.selectedSize === size
            ? { ...i, quantity: Math.min(qty, i.maxStock ?? 99) }
            : i
        )
      )
    },
    []
  )

  const clearCart = useCallback(() => setItems([]), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const handleCheckout = () => {
    if (items.length === 0) return
    const phoneNumber = "5491121615661"
    let msg = "🛒 *CRANINY - PEDIDO NUEVO*\n━━━━━━━━━━━━━━━━━━━━━\n\n"
    items.forEach((item, idx) => {
      msg += `*${idx + 1}. ${item.name}*\n`
      msg += `   Talle: ${item.selectedSize} | Color: ${item.selectedColor}\n`
      msg += `   Cantidad: ${item.quantity}\n`
      msg += `   Subtotal: ${fmt(item.price * item.quantity)}\n\n`
    })
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n💰 *TOTAL: ${fmt(total)}*\n`
    msg += `💳 *Con ${discountType}: ${fmt(transferTotal)} (${discountPercent}% off)*\n\n`
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`
    msg += `📦 *Datos de pago:*\n`
    msg += `   Alias: *Valenmotzo*\n`
    msg += `   Nombre: *Valentin Tomas Motzo*\n`
    msg += `   ‼️ *Enviar comprobante*\n\n`
    msg += "Quedo a la espera para coordinar el envío. ¡Gracias!"
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, "_blank")
    clearCart()
  }

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        total,
        transferTotal,
        count,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}

      {/* ── Global cart sheet — rendered once, accessible from any page ── */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col border-slate-200 bg-white text-slate-900 sm:max-w-md">
          <SheetHeader className="border-b border-slate-200 pb-4">
            <SheetTitle className="text-lg font-black tracking-widest text-slate-900">
              TU CARRITO
              {count > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {count} {count === 1 ? "producto" : "productos"}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
              <ShoppingBag className="size-12 text-slate-200" />
              <p className="text-sm tracking-wide text-slate-400">
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.selectedColor}-${item.selectedSize}`}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                          {item.name}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              item.id,
                              item.selectedColor,
                              item.selectedSize
                            )
                          }
                          className="shrink-0 text-slate-300 transition hover:text-red-500"
                          aria-label="Quitar producto"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        {item.selectedColor} · {item.selectedSize}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(
                                item.id,
                                item.selectedColor,
                                item.selectedSize,
                                item.quantity - 1
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(
                                item.id,
                                item.selectedColor,
                                item.selectedSize,
                                item.quantity + 1
                              )
                            }
                            disabled={item.quantity >= (item.maxStock ?? 99)}
                            className="flex h-7 w-7 items-center justify-center text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          {fmt(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <SheetFooter className="flex-col gap-3 border-t border-slate-200 pt-4">
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="text-lg font-black text-slate-900">
                      {fmt(total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600 font-medium">
                      Con {discountType} ({discountPercent}% off)
                    </span>
                    <span className="font-bold text-red-600">
                      {fmt(transferTotal)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-emerald-500 font-bold text-slate-900 hover:bg-emerald-400"
                >
                  Finalizar pedido por WhatsApp 📱
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </CartContext.Provider>
  )
}
