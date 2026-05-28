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
import { ShoppingBag, X, CheckCircle, AlertCircle } from "lucide-react"
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

  const [showForm, setShowForm] = useState(false)
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [orderState, setOrderState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [whatsappUrl, setWhatsappUrl] = useState("")
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null)

  // Build the WhatsApp URL synchronously — must run BEFORE any async operation
  // to capture the current cart state and avoid popup blockers
  const buildWhatsAppUrl = (name: string, phone: string, cartItems: CartItem[], tot: number, discTot: number, discType: string, discPct: number): string => {
    const phoneNumber = "5491121615661"
    let msg = "🛒 *PEDIDO CRANINY*\n━━━━━━━━━━━━━━━━━━━━━\n\n"
    if (name) msg += `👤 *${name}*`
    if (phone) msg += ` | 📞 ${phone}`
    if (name || phone) msg += "\n\n"
    cartItems.forEach((item, idx) => {
      msg += `*${idx + 1}. ${item.name}*\n`
      msg += `   🎨 Color: ${item.selectedColor}   📐 Talle: ${item.selectedSize}\n`
      msg += `   🔢 Cantidad: ${item.quantity}   💵 Subtotal: ${fmt(item.price * item.quantity)}\n\n`
    })
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`
    msg += `💰 *TOTAL: ${fmt(tot)}*\n`
    msg += `💳 *Con ${discType}: ${fmt(discTot)} (${discPct}% off)*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`
    msg += `📦 *Datos de pago:*\n`
    msg += `   Alias: *Valenmotzo*\n`
    msg += `   Nombre: *Valentin Tomas Motzo*\n`
    msg += `   ‼️ Enviame el comprobante por acá\n\n`
    msg += "¡Muchas gracias por tu compra! 🙌 Te contacto para coordinar el envío."
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`
  }

  const resetCheckout = () => {
    setShowForm(false)
    setClientName("")
    setClientPhone("")
    setOrderState("idle")
    setWhatsappUrl("")
    setSavedOrderId(null)
  }

  const handleConfirmOrder = async () => {
    if (items.length === 0) return

    // ⚠️ CRITICAL: Generate URL synchronously BEFORE any await.
    // After an await, browsers classify the call as async and block window.open().
    // By storing the URL in state now and using <a href> later, the user's
    // click on the link is always treated as a direct user action → never blocked.
    const url = buildWhatsAppUrl(
      clientName.trim(), clientPhone.trim(),
      items, total, transferTotal, discountType, discountPercent
    )
    setWhatsappUrl(url)
    setOrderState("submitting")

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            nombre: i.name,
            price: i.price,
            selectedSize: i.selectedSize,
            selectedColor: i.selectedColor,
            quantity: i.quantity,
          })),
          nombre_cliente: clientName.trim() || null,
          telefono_cliente: clientPhone.trim() || null,
          total: transferTotal,
        }),
      })
      const data = await res.json()
      if (data.orderId) setSavedOrderId(data.orderId)
    } catch {
      // API failed — order not saved, but user can still contact via WhatsApp
    }

    // Whether API succeeded or failed, show success screen and clear cart.
    // The WhatsApp button is always shown so the purchase is never lost.
    clearCart()
    setOrderState("success")
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

          {/* ── Success screen after order confirmed ── */}
          {orderState === "success" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">¡Pedido registrado!</h3>
                <p className="text-sm text-slate-500">
                  {savedOrderId ? `Nro. de pedido: #${savedOrderId}` : "Tu pedido fue procesado."}
                </p>
                <p className="text-sm text-slate-500">
                  Hacé clic abajo para finalizar la compra y coordinar el envío por WhatsApp.
                </p>
              </div>

              {/* Primary CTA — <a href> so browser NEVER blocks it */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setIsOpen(false); resetCheckout() }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-black text-slate-900 transition hover:bg-emerald-400 active:scale-95"
              >
                <span className="text-lg">📱</span>
                Finalizar por WhatsApp
              </a>

              <button
                type="button"
                onClick={() => { setIsOpen(false); resetCheckout() }}
                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
              >
                Cerrar sin abrir WhatsApp
              </button>
            </div>
          )}

          {items.length === 0 && orderState !== "success" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
              <ShoppingBag className="size-12 text-slate-200" />
              <p className="text-sm tracking-wide text-slate-400">
                Tu carrito está vacío
              </p>
            </div>
          ) : orderState !== "success" && (
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

              <SheetFooter className="flex-col gap-3 border-t border-slate-200 pt-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="text-lg font-black text-slate-900">{fmt(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600 font-medium">Con {discountType} ({discountPercent}% off)</span>
                    <span className="font-bold text-red-600">{fmt(transferTotal)}</span>
                  </div>
                </div>

                {!showForm ? (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-emerald-500 font-bold text-slate-900 hover:bg-emerald-400"
                  >
                    Finalizar pedido por WhatsApp 📱
                  </Button>
                ) : (
                  <div className="w-full space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Tus datos <span className="normal-case font-normal text-slate-400">(opcional — para el registro)</span>
                    </p>
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Tu teléfono (ej: 1134567890)"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white"
                    />
                    {orderState === "error" && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                        <p className="text-xs text-red-600">No pudimos registrar el pedido, pero podés continuar por WhatsApp.</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setOrderState("idle") }}
                        disabled={orderState === "submitting"}
                        className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                      <Button
                        onClick={handleConfirmOrder}
                        disabled={orderState === "submitting"}
                        className="flex-1 bg-emerald-500 font-bold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {orderState === "submitting" ? (
                          <span className="flex items-center gap-1.5">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Registrando...
                          </span>
                        ) : "Confirmar pedido 📱"}
                      </Button>
                    </div>
                  </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>

      </Sheet>
    </CartContext.Provider>
  )
}
