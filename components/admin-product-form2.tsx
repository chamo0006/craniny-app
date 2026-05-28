"use client"

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react"
import {
  Plus,
  X,
  Package,
  PackageCheck,
  AlertTriangle,
  AlertCircle,
  Check,
  RefreshCw,
  ChevronDown,
  ImagePlus,
  Save,
  Trash2,
  GripVertical,
  Truck,
  Database,
  ArrowUpCircle,
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  SendHorizontal,
  XCircle,
  ChevronRight,
  Phone,
} from "lucide-react"
import Image from "next/image"

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: number; nombre: string }
type CellKey = string // `${color}|${talle}`
type VariantCell = { stock: number; sku: string }
type ProductVariant = {
  id: number
  producto_id: number
  color: string
  talle: string
  stock: number
  imagen_url: string | null
}
type StockProduct = {
  id: number
  name: string
  price: number
  category: string
  variants: ProductVariant[]
  imagenes?: string[]
}
type StockFilter = "all" | "out" | "low"
type AdminTab = "dashboard" | "nuevo" | "stock" | "pedidos" | "categorias" | "colores" | "config"
type OrderStatus = "pendiente" | "pagado" | "enviado" | "cancelado"
type OrderItem = { id: number; nombre_producto: string; talle: string | null; color: string | null; cantidad: number; precio_unitario: number }
type Order = { id: number; created_at: string; estado: OrderStatus; total: number; nombre_cliente: string | null; telefono_cliente: string | null; notas: string | null; items: OrderItem[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Único"]
const PRESET_COLORS = [
  "Negro", "Blanco", "Gris", "Rojo", "Azul",
  "Verde", "Beige", "Oliva", "Bordo", "Celeste",
]
const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, nombre: "Buzos" },
  { id: 2, nombre: "Remeras" },
  { id: 3, nombre: "Pantalones" },
  { id: 4, nombre: "Camperas" },
  { id: 5, nombre: "Bermudas" },
  { id: 6, nombre: "Gorras" },
]
const LOW_STOCK = 3

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cellKey = (color: string, talle: string): CellKey => `${color}|${talle}`

function stockBadge(stock: number, manualLow: boolean) {
  if (stock === 0)
    return { label: "Sin stock", cls: "bg-red-100 text-red-700 border-red-200" }
  if (stock <= LOW_STOCK || manualLow)
    return {
      label: "Últimas unidades",
      cls: "bg-orange-100 text-orange-700 border-orange-200",
    }
  return null
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {children}
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[20px] sm:rounded-[24px] border border-slate-100 bg-slate-50/60 p-4 sm:p-6 space-y-4 sm:space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      {children}
    </div>
  )
}

// ─── NEW PRODUCT SECTION ──────────────────────────────────────────────────────

function NewProductSection() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [activo, setActivo] = useState(true)

  const [freeShipping, setFreeShipping] = useState(false)

  const [colors, setColors] = useState<string[]>([])
  const [colorInput, setColorInput] = useState("")
  const [sizes, setSizes] = useState<string[]>([])
  const [customSize, setCustomSize] = useState("")
  const [cells, setCells] = useState<Map<CellKey, VariantCell>>(new Map())
  const [showSku, setShowSku] = useState(false)

  // Image upload
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const colorInputRef = useRef<HTMLInputElement>(null)

  // Fetch real categories
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.categories?.length) setCategories(d.categories)
      })
      .catch(() => {})
  }, [])

  // Re-sync variant grid when colors or sizes change
  useEffect(() => {
    setCells((prev) => {
      const next = new Map<CellKey, VariantCell>()
      for (const c of colors) {
        for (const s of sizes) {
          const k = cellKey(c, s)
          next.set(k, prev.get(k) ?? { stock: 0, sku: "" })
        }
      }
      return next
    })
  }, [colors, sizes])

  // Color tag helpers
  const addColor = useCallback(
    (raw: string) => {
      const v = raw.trim()
      if (v && !colors.includes(v)) setColors((p) => [...p, v])
      setColorInput("")
    },
    [colors]
  )
  const removeColor = useCallback(
    (c: string) => setColors((p) => p.filter((x) => x !== c)),
    []
  )
  const handleColorKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addColor(colorInput)
    }
    if (e.key === "Backspace" && !colorInput && colors.length > 0)
      setColors((p) => p.slice(0, -1))
  }

  // Size helpers
  const toggleSize = useCallback(
    (s: string) =>
      setSizes((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s])),
    []
  )
  const addCustomSize = () => {
    const v = customSize.trim()
    if (v && !sizes.includes(v)) {
      setSizes((p) => [...p, v])
      setCustomSize("")
    }
  }

  // Image upload
  const uploadImages = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append("files", f))
      const res = await fetch("/api/admin/upload", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al subir")
      setUploadedUrls((prev) => [...prev, ...(data.urls as string[])])
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Grid cell update
  const updateCell = (
    color: string,
    talle: string,
    field: "stock" | "sku",
    value: string | number
  ) => {
    const k = cellKey(color, talle)
    setCells((prev) => {
      const next = new Map(prev)
      next.set(k, { ...(next.get(k) ?? { stock: 0, sku: "" }), [field]: value })
      return next
    })
  }

  const buildVariants = () => {
    // Map each color to an uploaded image (cycle if fewer images than colors)
    const colorImageMap = new Map<string, string | null>()
    colors.forEach((color, idx) => {
      colorImageMap.set(color, uploadedUrls[idx % Math.max(uploadedUrls.length, 1)] ?? null)
    })
    return [...cells.entries()].map(([k, cell]) => {
      const [color, talle] = k.split("|")
      return {
        color,
        talle,
        stock: cell.stock,
        imagen_url: colorImageMap.get(color) ?? uploadedUrls[0] ?? null,
        ...(cell.sku ? { sku: cell.sku } : {}),
      }
    })
  }

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const resetForm = () => {
    setNombre("")
    setDescripcion("")
    setPrecio("")
    setCategoria("")
    setActivo(true)
    setFreeShipping(false)
    setColors([])
    setSizes([])
    setCells(new Map())
    setUploadedUrls([])
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const parsedPrice = Number(precio.replace(",", "."))
    if (!nombre.trim()) return showToast("El nombre es obligatorio.", "err")
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0)
      return showToast("El precio debe ser mayor a 0.", "err")

    setLoading(true)
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion,
          precio: parsedPrice,
          categoria,
          activo,
          variants: buildVariants(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Error al guardar")
      if (freeShipping && data.id) {
        await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: data.id, freeShipping: true }),
        }).catch(() => {})
      }
      showToast(`¡Producto creado! ID: ${data.id}`, "ok")
      resetForm()
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Info básica ── */}
      <SectionCard title="Información básica">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del producto">
            <input
              className={inputCls}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Buzo Oversized Negro"
            />
          </Field>

          <Field label="Categoría">
            <div className="relative">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer pr-10`}
              >
                <option value="">— Seleccionar —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            rows={3}
            className={`${inputCls} resize-none`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describí el producto brevemente..."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 items-end">
          <Field label="Precio ($)">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 text-sm select-none">
                $
              </span>
              <input
                type="number"
                min="0"
                step="any"
                className={`${inputCls} pl-8`}
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="45000"
              />
            </div>
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
              <span className="text-sm font-medium text-slate-700">Producto activo</span>
              <button
                type="button"
                onClick={() => setActivo(!activo)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${activo ? "bg-slate-800" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${activo ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Envío gratis</span>
              </div>
              <button
                type="button"
                onClick={() => setFreeShipping(!freeShipping)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${freeShipping ? "bg-emerald-500" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${freeShipping ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Imágenes ── */}
      <SectionCard title="Imágenes del producto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && uploadImages(e.target.files)}
        />
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 transition hover:border-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            {uploading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading ? "Subiendo..." : "Subir imágenes"}
          </button>
          {uploadedUrls.length > 0 && (
            <span className="text-xs text-slate-400">
              {uploadedUrls.length} imagen{uploadedUrls.length !== 1 ? "es" : ""} subida{uploadedUrls.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {uploadedUrls.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {uploadedUrls.map((url, i) => (
              <div
                key={url}
                className="relative group h-20 w-20 shrink-0 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50"
              >
                <Image src={url} alt={`Imagen ${i + 1}`} fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setUploadedUrls((p) => p.filter((_, j) => j !== i))}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            La primera imagen subida será la imagen principal del producto.
          </p>
        )}
      </SectionCard>

      {/* ── Colores y talles ── */}
      <SectionCard title="Variantes — Colores y talles">
        {/* Color tag input */}
        <Field label="Colores disponibles">
          <div
            className="min-h-[44px] flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 cursor-text transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"
            onClick={() => colorInputRef.current?.focus()}
          >
            {colors.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700"
              >
                {c}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeColor(c) }}
                  className="rounded-full p-0.5 hover:bg-slate-200 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={colorInputRef}
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={handleColorKey}
              onBlur={() => colorInput.trim() && addColor(colorInput)}
              placeholder={
                colors.length === 0 ? "Escribe un color y presiona Enter..." : ""
              }
              className="flex-1 min-w-[160px] bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESET_COLORS.filter((c) => !colors.includes(c)).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => !colors.includes(c) && setColors((p) => [...p, c])}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
              >
                + {c}
              </button>
            ))}
          </div>
        </Field>

        {/* Size checkboxes */}
        <Field label="Talles disponibles">
          <div className="flex flex-wrap gap-2">
            {PRESET_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  sizes.includes(s)
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {s}
              </button>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCustomSize() }
                }}
                placeholder="Otro..."
                className="w-20 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
              {customSize.trim() && (
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="rounded-full bg-slate-100 p-1.5 hover:bg-slate-200 transition"
                >
                  <Plus className="h-3 w-3 text-slate-600" />
                </button>
              )}
            </div>
          </div>
        </Field>

        {/* Variant stock grid */}
        {colors.length > 0 && sizes.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-600">{cells.size}</span>{" "}
                combinaciones generadas
              </p>
              <button
                type="button"
                onClick={() => setShowSku(!showSku)}
                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-700 transition"
              >
                {showSku ? "Ocultar SKU" : "Mostrar campos SKU"}
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="py-3 pl-4 text-left font-medium text-slate-500 w-32">
                      Color
                    </th>
                    {sizes.map((s) => (
                      <th
                        key={s}
                        className="py-3 px-3 text-center font-semibold text-slate-700 min-w-[80px]"
                      >
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {colors.map((color) => (
                    <tr key={color}>
                      <td className="py-3 pl-4">
                        <span className="font-medium text-slate-800">{color}</span>
                      </td>
                      {sizes.map((talle) => {
                        const k = cellKey(color, talle)
                        const cell = cells.get(k) ?? { stock: 0, sku: "" }
                        return (
                          <td key={talle} className="py-2.5 px-2">
                            <input
                              type="number"
                              min="0"
                              value={cell.stock}
                              onChange={(e) =>
                                updateCell(color, talle, "stock", Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-100"
                            />
                            {showSku && (
                              <input
                                type="text"
                                value={cell.sku}
                                onChange={(e) =>
                                  updateCell(color, talle, "sku", e.target.value)
                                }
                                placeholder="SKU"
                                className="mt-1 w-full rounded-xl border border-dashed border-slate-200 bg-transparent px-2 py-1 text-center text-[10px] text-slate-500 outline-none placeholder:text-slate-300 focus:border-slate-400"
                              />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">
              Agregá colores y talles para generar la grilla de stock
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── Submit ── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-7 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Guardar producto
            </>
          )}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="rounded-full border border-slate-200 px-5 py-2.5 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
        >
          Limpiar
        </button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl transition-all ${
            toast.type === "ok"
              ? "bg-emerald-950 text-emerald-100"
              : "bg-red-950 text-red-100"
          }`}
        >
          {toast.type === "ok" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </form>
  )
}

// ─── STOCK CONTROL SECTION ────────────────────────────────────────────────────

function StockControlSection() {
  const [products, setProducts] = useState<StockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StockFilter>("all")
  const [manualLow, setManualLow] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      return new Set(
        JSON.parse(localStorage.getItem("craniny_manual_low") || "[]") as string[]
      )
    } catch {
      return new Set()
    }
  })

  const [edits, setEdits] = useState<Map<number, { variantId: number; productId: number; talle: string; color: string; stock: number }>>(new Map())
  const [priceEdits, setPriceEdits] = useState<Map<number, number>>(new Map())
  const [nameEdits, setNameEdits] = useState<Map<number, string>>(new Map())
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [freeShippingIds, setFreeShippingIds] = useState<Set<number>>(new Set())
  const [expandedImageEdit, setExpandedImageEdit] = useState<number | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [expandedAddVariant, setExpandedAddVariant] = useState<number | null>(null)
  const [newVariant, setNewVariant] = useState({ talle: "", color: "", stock: 0 })
  const [addingVariant, setAddingVariant] = useState(false)
  const [confirmDeleteVariant, setConfirmDeleteVariant] = useState<string | null>(null)
  const [deletingVariant, setDeletingVariant] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prodRes, settingsRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/settings"),
      ])
      if (prodRes.ok) {
        const data = await prodRes.json()
        setProducts(data.products || [])
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json()
        const ids = new Set<number>()
        for (const [idStr, ps] of Object.entries(s.products ?? {})) {
          if ((ps as any).freeShipping) ids.add(Number(idStr))
        }
        setFreeShippingIds(ids)
      }
    } catch {}
    setLoading(false)
  }, [])

  const toggleFreeShipping = async (productId: number) => {
    const current = freeShippingIds.has(productId)
    setFreeShippingIds((prev) => {
      const next = new Set(prev)
      current ? next.delete(productId) : next.add(productId)
      return next
    })
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, freeShipping: !current }),
    }).catch(() => {})
  }

  useEffect(() => { load() }, [load])

  const getProductImageList = (product: StockProduct): string[] => getFullImageList(product)

  const patchProductImages = async (productId: number, imagenes: string[]) => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ id: productId, imagenes }]),
    })
    if (!res.ok) throw new Error((await res.json())?.error ?? "Error al guardar imágenes")
    load()
  }

  // Returns the full image list for a product, seeding from variant images when no explicit list exists
  const getFullImageList = (product: StockProduct): string[] => {
    if (product.imagenes && product.imagenes.length > 0) return product.imagenes
    return [...new Set(product.variants.map((v) => v.imagen_url).filter((u): u is string => Boolean(u)))]
  }

  const addImagesToProduct = async (product: StockProduct, files: FileList) => {
    if (!files.length) return
    setImageUploading(true)
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append("files", f))
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: form })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData?.error ?? "Error al subir")
      const newUrls: string[] = uploadData.urls
      const current = getFullImageList(product)
      await patchProductImages(product.id, [...current, ...newUrls])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setImageUploading(false)
    }
  }

  const removeImageFromProduct = async (product: StockProduct, url: string) => {
    try {
      const newImages = getFullImageList(product).filter((u) => u !== url)
      await patchProductImages(product.id, newImages)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const addVariantToProduct = async (productId: number) => {
    if (!newVariant.talle.trim() || !newVariant.color.trim()) {
      alert("Completá el talle y el color")
      return
    }
    setAddingVariant(true)
    try {
      const res = await fetch("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, talle: newVariant.talle.trim(), color: newVariant.color.trim(), stock: newVariant.stock }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? "Error al agregar")
      setNewVariant({ talle: "", color: "", stock: 0 })
      setExpandedAddVariant(null)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAddingVariant(false)
    }
  }

  const deleteVariant = async (variantId: number, productId: number, talle: string, color: string) => {
    setDeletingVariant(true)
    try {
      const params = new URLSearchParams({
        variantId: String(variantId),
        productId: String(productId),
        talle,
        color,
      })
      const res = await fetch(`/api/admin/variants?${params}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al eliminar")
      setConfirmDeleteVariant(null)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingVariant(false)
    }
  }

  const saveEdits = async () => {
    if (edits.size === 0 && priceEdits.size === 0 && nameEdits.size === 0) return
    setSaving(true)
    try {
      const promises: Promise<void>[] = []

      if (edits.size > 0) {
        promises.push(
          fetch("/api/admin/variants", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([...edits.values()]),
          }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json())?.error ?? "Error al guardar stock")
          })
        )
      }

      if (priceEdits.size > 0 || nameEdits.size > 0) {
        const allIds = new Set([...priceEdits.keys(), ...nameEdits.keys()])
        const productUpdates = [...allIds].map((id) => {
          const u: { id: number; precio?: number; nombre?: string } = { id }
          if (priceEdits.has(id)) u.precio = priceEdits.get(id)!
          if (nameEdits.has(id)) u.nombre = nameEdits.get(id)!
          return u
        })
        promises.push(
          fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productUpdates),
          }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json())?.error ?? "Error al guardar")
          })
        )
      }

      await Promise.all(promises)
      setEdits(new Map())
      setPriceEdits(new Map())
      setNameEdits(new Map())
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (id: number) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? "Error al eliminar")
      setConfirmDelete(null)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const toggleManualLow = (key: string) => {
    setManualLow((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      localStorage.setItem("craniny_manual_low", JSON.stringify([...next]))
      return next
    })
  }

  const allVariants = useMemo(
    () => products.flatMap((p) => p.variants),
    [products]
  )

  const stats = useMemo(
    () => ({
      total: allVariants.length,
      out: allVariants.filter((v) => v.stock === 0).length,
      low: allVariants.filter((v) => v.stock > 0 && v.stock <= LOW_STOCK).length,
    }),
    [allVariants]
  )

  const filtered = useMemo(() => {
    if (filter === "out")
      return products
        .map((p) => ({ ...p, variants: p.variants.filter((v) => v.stock === 0) }))
        .filter((p) => p.variants.length > 0)

    if (filter === "low")
      return products
        .map((p) => ({
          ...p,
          variants: p.variants.filter((v) => {
            const k = `${p.id}|${v.color}|${v.talle}`
            return v.stock > 0 && (v.stock <= LOW_STOCK || manualLow.has(k))
          }),
        }))
        .filter((p) => p.variants.length > 0)

    return products
  }, [products, filter, manualLow])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-0.5">Variantes totales</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{stats.out}</p>
          <p className="text-xs text-red-400 mt-0.5">Sin stock</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-orange-600">{stats.low}</p>
          <p className="text-xs text-orange-400 mt-0.5">Últimas unidades</p>
        </div>
      </div>

      {/* Filter + refresh */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        {(
          [
            { key: "all", label: "Todos los productos" },
            { key: "out", label: `Sin stock · ${stats.out}` },
            { key: "low", label: `Últimas unidades · ${stats.low}` },
          ] as { key: StockFilter; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {(edits.size > 0 || priceEdits.size > 0 || nameEdits.size > 0) && (
            <button
              type="button"
              onClick={saveEdits}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving
                ? "Guardando..."
                : (() => {
                    const n = edits.size + priceEdits.size + nameEdits.size
                    return `Guardar ${n} cambio${n !== 1 ? "s" : ""}`
                  })()}
            </button>
          )}
          <button
            type="button"
            onClick={load}
            className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-400 hover:text-slate-700 transition"
            title="Actualizar stock"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3 text-orange-400" />
        Hacé clic en el ícono naranja para forzar manualmente la alerta &quot;Últimas unidades&quot; en el frontend.
      </p>

      {/* Product list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <PackageCheck className="mx-auto h-9 w-9 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">
              {filter === "all"
                ? "No hay productos cargados."
                : "No hay variantes con ese filtro activo."}
            </p>
          </div>
        ) : (
          filtered.map((product) => {
            const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
            return (
              <div
                key={product.id}
                className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm"
              >
                {/* Product header */}
                <div className="border-b border-slate-50 bg-slate-50/50 px-4 py-3 space-y-2">
                  {/* Row 1: name + category */}
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      value={nameEdits.get(product.id) ?? product.name}
                      onChange={(e) => {
                        setNameEdits((prev) => {
                          const next = new Map(prev)
                          next.set(product.id, e.target.value)
                          return next
                        })
                      }}
                      className={`flex-1 min-w-0 font-semibold text-sm bg-transparent border-b outline-none transition ${
                        nameEdits.has(product.id)
                          ? "border-amber-300 text-amber-700"
                          : "border-transparent hover:border-slate-300 text-slate-900"
                      }`}
                    />
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                      {product.category}
                    </span>
                  </div>

                  {/* Row 2: price + action buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 select-none">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={priceEdits.get(product.id) ?? product.price}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value))
                          setPriceEdits((prev) => {
                            const next = new Map(prev)
                            next.set(product.id, v)
                            return next
                          })
                        }}
                        className={`w-24 rounded-xl border px-2 py-1 text-right text-sm font-semibold outline-none transition focus:ring-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          priceEdits.has(product.id)
                            ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-200"
                            : "border-slate-200 bg-white text-slate-700 focus:ring-slate-100"
                        }`}
                      />
                    </div>

                    <div className="ml-auto flex items-center gap-1.5">
                      {/* Free shipping toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFreeShipping(product.id)}
                        title={freeShippingIds.has(product.id) ? "Quitar envío gratis" : "Activar envío gratis"}
                        className={`rounded-lg p-1.5 transition ${
                          freeShippingIds.has(product.id)
                            ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                            : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                      </button>

                      {/* Add variant toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedAddVariant(expandedAddVariant === product.id ? null : product.id)
                          setNewVariant({ talle: "", color: "", stock: 0 })
                        }}
                        title="Agregar talle"
                        className={`rounded-lg p-1.5 transition ${
                          expandedAddVariant === product.id
                            ? "bg-blue-100 text-blue-700"
                            : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      {/* Image edit toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedImageEdit(expandedImageEdit === product.id ? null : product.id)}
                        title="Cambiar imagen"
                        className={`rounded-lg p-1.5 transition ${
                          expandedImageEdit === product.id
                            ? "bg-slate-200 text-slate-700"
                            : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                        }`}
                      >
                        <ImagePlus className="h-4 w-4" />
                      </button>

                      {/* Delete product */}
                      {confirmDelete === product.id ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1">
                          <span className="text-[11px] font-semibold text-red-600">¿Eliminar?</span>
                          <button
                            type="button"
                            onClick={() => deleteProduct(product.id)}
                            disabled={deleting}
                            className="text-[11px] font-black text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Sí"}
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(product.id)}
                          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image edit panel */}
                {expandedImageEdit === product.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-3 sm:px-5 py-3">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Imágenes del producto:</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {getProductImageList(product).map((url) => (
                        <div
                          key={url}
                          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                        >
                          <Image src={url} alt="" fill sizes="56px" className="object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImageFromProduct(product, url)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                      <label
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700 ${imageUploading ? "pointer-events-none opacity-50" : ""}`}
                      >
                        {imageUploading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3.5 w-3.5" />
                        )}
                        {imageUploading ? "Subiendo..." : "Agregar"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          disabled={imageUploading}
                          onChange={(e) => {
                            if (e.target.files?.length) addImagesToProduct(product, e.target.files)
                            e.target.value = ""
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Add variant panel */}
                {expandedAddVariant === product.id && (
                  <div className="border-t border-blue-100 bg-blue-50/40 px-3 sm:px-5 py-3">
                    <p className="text-xs font-semibold text-blue-600 mb-2">Agregar talle / color:</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Talle</span>
                        <input
                          type="text"
                          placeholder="ej. XXL"
                          value={newVariant.talle}
                          onChange={(e) => setNewVariant((prev) => ({ ...prev, talle: e.target.value }))}
                          className="w-20 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Color</span>
                        <input
                          type="text"
                          placeholder="ej. Blanco"
                          value={newVariant.color}
                          onChange={(e) => setNewVariant((prev) => ({ ...prev, color: e.target.value }))}
                          className="w-28 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stock</span>
                        <input
                          type="number"
                          min="0"
                          value={newVariant.stock}
                          onChange={(e) => setNewVariant((prev) => ({ ...prev, stock: Math.max(0, Number(e.target.value)) }))}
                          className="w-16 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center text-sm font-bold outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addVariantToProduct(product.id)}
                        disabled={addingVariant}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {addingVariant ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Agregar
                      </button>
                    </div>
                  </div>
                )}

                {/* Variants */}
                <div className="divide-y divide-slate-50">
                  {product.variants.map((v) => {
                    const manualKey = `${product.id}|${v.color}|${v.talle}`
                    const isManual = manualLow.has(manualKey)
                    const badge = stockBadge(v.stock, isManual)

                    return (
                      <div
                        key={v.id}
                        className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 ${
                          v.stock === 0 ? "bg-red-50/30" : ""
                        }`}
                      >
                        {/* Color dot + name */}
                        <span className="w-16 sm:w-24 text-xs font-medium text-slate-700 truncate">
                          {v.color}
                        </span>

                        {/* Talle pill */}
                        <span className="rounded-full border border-slate-100 bg-slate-50 px-2 sm:px-2.5 py-0.5 text-xs text-slate-500 font-mono shrink-0">
                          {v.talle}
                        </span>

                        {/* Stock number */}
                        <input
                          type="number"
                          min="0"
                          value={edits.get(v.id)?.stock ?? v.stock}
                          onChange={(e) => {
                            const newStock = Math.max(0, Number(e.target.value))
                            setEdits((prev) => {
                              const next = new Map(prev)
                              next.set(v.id, { variantId: v.id, productId: product.id, talle: v.talle, color: v.color, stock: newStock })
                              return next
                            })
                          }}
                          className={`ml-auto w-14 sm:w-16 rounded-xl border px-2 py-1.5 text-center tabular-nums text-sm font-bold outline-none transition focus:ring-1 ${
                            edits.has(v.id)
                              ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-200"
                              : v.stock === 0
                              ? "border-red-100 bg-red-50/30 text-red-500 focus:ring-red-100"
                              : v.stock <= LOW_STOCK
                              ? "border-orange-100 bg-orange-50/30 text-orange-500 focus:ring-orange-100"
                              : "border-slate-100 bg-slate-50 text-slate-900 focus:ring-slate-100"
                          }`}
                        />

                        {/* Auto badge — hidden on mobile to avoid overflow */}
                        {badge && (
                          <span
                            className={`hidden sm:inline rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        )}

                        {/* Manual override (only shown when stock is above threshold) */}
                        {v.stock > LOW_STOCK && (
                          <button
                            type="button"
                            onClick={() => toggleManualLow(manualKey)}
                            title={
                              isManual
                                ? 'Quitar alerta "Últimas unidades"'
                                : 'Forzar "Últimas unidades" en frontend'
                            }
                            className={`rounded-full p-1.5 transition ${
                              isManual
                                ? "bg-orange-100 text-orange-500 hover:bg-orange-200"
                                : "text-slate-200 hover:text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete variant */}
                        {confirmDeleteVariant === `${v.id}` ? (
                          <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => deleteVariant(v.id, product.id, v.talle, v.color)}
                              disabled={deletingVariant}
                              className="text-[11px] font-black text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {deletingVariant ? <RefreshCw className="h-3 w-3 animate-spin inline" /> : "Sí"}
                            </button>
                            <span className="text-slate-300 text-xs">·</span>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVariant(null)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteVariant(`${v.id}`)}
                            className="rounded-lg p-1 text-slate-200 transition hover:bg-red-50 hover:text-red-400 shrink-0"
                            title="Eliminar esta variante"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── CATEGORIES SECTION ──────────────────────────────────────────────────────

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [savingOrder, setSavingOrder] = useState<"idle" | "saving" | "saved" | "error">("idle")
  // Drag-and-drop (desktop)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  // Editable position (mobile)
  const [editingPos, setEditingPos] = useState<number | null>(null)
  const [posInput, setPosInput] = useState("")

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addCategory = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al crear")
      showToast(`Categoría "${newName.trim()}" creada.`, "ok")
      setNewName("")
      load()
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setAdding(false)
    }
  }

  const deleteCategory = async (id: number) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al eliminar")
      setConfirmDelete(null)
      showToast("Categoría eliminada.", "ok")
      load()
    } catch (err: any) {
      showToast(err.message, "err")
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const saveOrder = async (ordered: Category[]) => {
    setSavingOrder("saving")
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ordered.map((c) => c.nombre) }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      setSavingOrder("saved")
      setTimeout(() => setSavingOrder("idle"), 2000)
    } catch {
      setSavingOrder("error")
      setTimeout(() => setSavingOrder("idle"), 3000)
    }
  }

  const moveCategory = (from: number, to: number) => {
    if (to < 0 || to >= categories.length) return
    const reordered = [...categories]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setCategories(reordered)
    saveOrder(reordered)
  }

  const confirmPosition = (fromIdx: number) => {
    const toPos = parseInt(posInput, 10)
    if (!isNaN(toPos) && toPos >= 1 && toPos <= categories.length) {
      moveCategory(fromIdx, toPos - 1)
    }
    setEditingPos(null)
  }

  // Desktop drag-and-drop handlers
  const onDragStart = (e: React.DragEvent, idx: number) => {
    // Ignore on touch/mobile devices
    if (!e.clientX && !e.clientY) { e.preventDefault(); return }
    setDragIdx(idx)
  }
  const onDragEnter = (idx: number) => setDragOverIdx(idx)
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null); setDragOverIdx(null); return
    }
    const reordered = [...categories]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(dragOverIdx, 0, moved)
    setCategories(reordered)
    setDragIdx(null); setDragOverIdx(null)
    saveOrder(reordered)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Add category */}
      <SectionCard title="Nueva categoría">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory() } }}
            placeholder="Ej: Accesorios"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {adding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </button>
        </div>
      </SectionCard>

      {/* Category list */}
      <SectionCard title={`Categorías (${categories.length})`}>
        <div className="-mt-1 flex items-center gap-2">
          <p className="text-xs text-slate-400">
            <span className="hidden sm:inline">Arrastrá para reordenar. </span>
            <span className="sm:hidden">Tocá el número para cambiar la posición. </span>
            El orden se guarda automáticamente.
          </p>
          {savingOrder === "saving" && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw className="h-3 w-3 animate-spin" /> Guardando...
            </span>
          )}
          {savingOrder === "saved" && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="h-3 w-3" /> Guardado
            </span>
          )}
          {savingOrder === "error" && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <AlertCircle className="h-3 w-3" /> Error al guardar
            </span>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No hay categorías cargadas.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <div
                key={`${cat.id}-${cat.nombre}`}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                className={`flex items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 transition select-none ${
                  dragOverIdx === idx && dragIdx !== idx ? "border-slate-400 shadow-md" : "border-slate-100"
                } ${dragIdx === idx ? "opacity-40" : ""}`}
              >
                {/* Desktop: grip handle */}
                <GripVertical className="hidden sm:block h-4 w-4 shrink-0 text-slate-300 cursor-grab active:cursor-grabbing" />

                {/* Mobile: editable position number */}
                <div className="sm:hidden shrink-0">
                  {editingPos === idx ? (
                    <input
                      type="number"
                      value={posInput}
                      autoFocus
                      min={1}
                      max={categories.length}
                      onChange={(e) => setPosInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); confirmPosition(idx) }
                        if (e.key === "Escape") setEditingPos(null)
                      }}
                      onBlur={() => confirmPosition(idx)}
                      className="w-10 rounded-lg border border-slate-400 bg-white px-1 py-0.5 text-center text-xs font-bold text-slate-700 outline-none focus:border-slate-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingPos(idx); setPosInput(String(idx + 1)) }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-400 transition hover:border-slate-400 hover:text-slate-700"
                      title="Tocá para cambiar la posición"
                    >
                      {idx + 1}
                    </button>
                  )}
                </div>

                {/* Up / Down arrows (both mobile and desktop) */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveCategory(idx, idx - 1)}
                    disabled={idx === 0}
                    className="flex h-5 w-5 items-center justify-center rounded text-[10px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => moveCategory(idx, idx + 1)}
                    disabled={idx === categories.length - 1}
                    className="flex h-5 w-5 items-center justify-center rounded text-[10px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                  >▼</button>
                </div>

                {/* Category name */}
                <span className="flex-1 text-sm font-semibold text-slate-800">{cat.nombre}</span>

                {/* Delete */}
                {confirmDelete === cat.id ? (
                  <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 shrink-0">
                    <span className="text-xs font-semibold text-red-600">¿Eliminar?</span>
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat.id)}
                      disabled={deleting}
                      className="text-xs font-black text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deleting ? <RefreshCw className="h-3 w-3 animate-spin inline" /> : "Sí"}
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(cat.id) }}
                    className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 shrink-0"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ${
            toast.type === "ok" ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
          }`}
        >
          {toast.type === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── SETTINGS SECTION ────────────────────────────────────────────────────────

type ProdDiscount = { discountType?: "transferencia" | "efectivo"; discountPercent?: number; freeShipping?: boolean }

function SettingsSection() {
  // Global defaults
  const [globalType, setGlobalType] = useState<"transferencia" | "efectivo">("transferencia")
  const [globalPercent, setGlobalPercent] = useState(20)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(180000)
  // Products
  const [products, setProducts] = useState<StockProduct[]>([])
  const [productOverrides, setProductOverrides] = useState<Record<string, ProdDiscount>>({})
  // Selected product for editing
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editType, setEditType] = useState<"transferencia" | "efectivo">("transferencia")
  const [editPercent, setEditPercent] = useState(20)
  const [editFreeShipping, setEditFreeShipping] = useState(false)
  const [useGlobal, setUseGlobal] = useState(true)

  const [loading, setLoading] = useState(true)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/products"),
      ])
      if (sRes.ok) {
        const s = await sRes.json()
        setGlobalType(s.defaultDiscountType ?? "transferencia")
        setGlobalPercent(s.defaultDiscountPercent ?? 20)
        setFreeShippingThreshold(s.freeShippingThreshold ?? 180000)
        setProductOverrides(s.products ?? {})
      }
      if (pRes.ok) {
        const p = await pRes.json()
        setProducts(p.products ?? [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // When selected product changes, load its current override
  useEffect(() => {
    if (selectedId === null) return
    const override = productOverrides[String(selectedId)]
    if (override && (override.discountType || override.discountPercent !== undefined)) {
      setUseGlobal(false)
      setEditType(override.discountType ?? globalType)
      setEditPercent(override.discountPercent ?? globalPercent)
    } else {
      setUseGlobal(true)
      setEditType(globalType)
      setEditPercent(globalPercent)
    }
    setEditFreeShipping(override?.freeShipping ?? false)
  }, [selectedId, productOverrides, globalType, globalPercent])

  const saveGlobal = async () => {
    setSavingGlobal(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: { defaultDiscountType: globalType, defaultDiscountPercent: globalPercent, freeShippingThreshold } }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      showToast("Configuración global guardada.", "ok")
      loadAll()
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setSavingGlobal(false)
    }
  }

  const saveProduct = async () => {
    if (selectedId === null) return
    setSavingProduct(true)
    try {
      const body: Record<string, unknown> = { productId: selectedId, freeShipping: editFreeShipping }
      if (!useGlobal) {
        body.discountType = editType
        body.discountPercent = editPercent
      }
      // If going back to global for discount, remove the override fields by deleting and re-adding only freeShipping
      if (useGlobal) {
        // Remove existing override, then re-add with only freeShipping if needed
        await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteProductId: selectedId }),
        })
        if (editFreeShipping) {
          await fetch("/api/admin/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: selectedId, freeShipping: true }),
          })
        }
      } else {
        await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      showToast("Ajustes del producto guardados.", "ok")
      loadAll()
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setSavingProduct(false)
    }
  }

  const removeOverride = async (productId: number) => {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteProductId: productId }),
    })
    loadAll()
  }

  const previewPrice = Math.round(45000 * (1 - (useGlobal ? globalPercent : editPercent) / 100))
  const previewType = useGlobal ? globalType : editType

  if (loading) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="h-6 w-6 animate-spin text-slate-300" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Global defaults */}
      <SectionCard title="Descuento global — afecta TODOS los productos">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tipo de pago">
            <div className="relative">
              <select value={globalType} onChange={(e) => setGlobalType(e.target.value as "transferencia" | "efectivo")} className={`${inputCls} appearance-none cursor-pointer pr-10`}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </Field>
          <Field label={`Descuento: ${globalPercent}%`}>
            <input type="range" min="0" max="80" step="1" value={globalPercent} onChange={(e) => setGlobalPercent(Number(e.target.value))} className="w-full accent-slate-900 mt-2" />
            <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0%</span><span className="font-bold text-slate-700">{globalPercent}% off</span><span>80%</span></div>
          </Field>
        </div>
        <Field label={`Umbral de envío gratis: $${new Intl.NumberFormat("es-AR").format(freeShippingThreshold)}`}>
          <input
            type="number"
            min="0"
            step="1000"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(Math.max(0, Number(e.target.value)))}
            className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <p className="text-xs text-slate-400 mt-1">Monto mínimo de compra para mostrar envío gratis en la tienda.</p>
        </Field>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium">
            Este botón cambia la configuración de <span className="font-black">todos los productos</span> que no tengan ajustes específicos. Si querés cambiar solo un producto, usá la sección de abajo.
          </p>
        </div>
        <button type="button" onClick={saveGlobal} disabled={savingGlobal} className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50">
          {savingGlobal ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {savingGlobal ? "Guardando..." : "Guardar para todos los productos"}
        </button>
      </SectionCard>

      {/* Per-product */}
      <SectionCard title="Configuración específica por producto (solo afecta al producto elegido)">
        <Field label="Seleccioná un producto">
          <div className="relative">
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              className={`${inputCls} appearance-none cursor-pointer pr-10`}
            >
              <option value="">— Elegir producto —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </Field>

        {selectedId !== null && (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4">
            {/* Use global toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Usar descuento global</span>
              <button type="button" onClick={() => setUseGlobal(!useGlobal)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${useGlobal ? "bg-slate-800" : "bg-slate-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${useGlobal ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {!useGlobal && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de pago">
                  <div className="relative">
                    <select value={editType} onChange={(e) => setEditType(e.target.value as "transferencia" | "efectivo")} className={`${inputCls} appearance-none cursor-pointer pr-10`}>
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </Field>
                <Field label={`Descuento: ${editPercent}%`}>
                  <input type="range" min="0" max="80" step="1" value={editPercent} onChange={(e) => setEditPercent(Number(e.target.value))} className="w-full accent-slate-900 mt-2" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0%</span><span className="font-bold text-slate-700">{editPercent}% off</span><span>80%</span></div>
                </Field>
              </div>
            )}

            {/* Free shipping */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Envío gratis en este producto</span>
              </div>
              <button type="button" onClick={() => setEditFreeShipping(!editFreeShipping)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${editFreeShipping ? "bg-emerald-500" : "bg-slate-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${editFreeShipping ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-400 mb-1">Vista previa:</p>
              <p className="text-xs text-slate-400 line-through">$ 45.000</p>
              <p className="text-lg font-black text-red-600">
                $ {new Intl.NumberFormat("es-AR").format(previewPrice)}
                <span className="ml-2 text-xs font-bold text-red-500">con {previewType === "transferencia" ? "Transferencia" : "Efectivo"}</span>
              </p>
              {editFreeShipping && <p className="text-[11px] text-emerald-600 font-semibold mt-1">✓ Envío gratis activado</p>}
            </div>

            <button type="button" onClick={saveProduct} disabled={savingProduct} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
              {savingProduct ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {savingProduct ? "Guardando..." : "Guardar para este producto"}
            </button>
          </div>
        )}
      </SectionCard>

      {/* Current overrides list */}
      {Object.keys(productOverrides).length > 0 && (
        <SectionCard title="Productos con configuración específica">
          <div className="space-y-2">
            {Object.entries(productOverrides).map(([idStr, ps]) => {
              const prod = products.find((p) => String(p.id) === idStr)
              if (!prod) return null
              return (
                <div key={idStr} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{prod.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ps.discountType ? `${ps.discountPercent ?? globalPercent}% — ${ps.discountType}` : "Descuento: global"}
                      {ps.freeShipping ? " · Envío gratis" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeOverride(prod.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition" title="Eliminar configuración específica">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Migration to DB ── */}
      <MigrationSection />

      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ${toast.type === "ok" ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
          {toast.type === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── MIGRATION SECTION ───────────────────────────────────────────────────────

type MigrationResult = { name: string; status: string; newId?: number; error?: string }
type MigrationPreview = { pending: { id: number; nombre: string }[]; already: { id: number; nombre: string }[]; total: number }

function MigrationSection() {
  const [preview, setPreview] = useState<MigrationPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [results, setResults] = useState<MigrationResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPreview = async () => {
    setPreviewing(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/migrate")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al consultar")
      setPreview(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const runMigration = async () => {
    setMigrating(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch("/api/admin/migrate", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al migrar")
      setResults(data.results)
      setPreview(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMigrating(false)
    }
  }

  return (
    <SectionCard title="Migración a base de datos">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Database className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
        <p className="text-xs text-blue-700 font-medium">
          Migrá todos los productos locales (hardcodeados y guardados en archivos) a Supabase. Después de migrar, podés eliminar y editar todo desde el panel sin errores.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {!preview && !results && (
        <button
          type="button"
          onClick={loadPreview}
          disabled={previewing}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
        >
          {previewing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {previewing ? "Verificando..." : "Ver qué se va a migrar"}
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{preview.pending.length}</p>
              <p className="text-xs text-blue-500 mt-0.5">Por migrar</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{preview.already.length}</p>
              <p className="text-xs text-emerald-500 mt-0.5">Ya en DB</p>
            </div>
          </div>

          {preview.pending.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-500 mb-2">Se van a migrar:</p>
              {preview.pending.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <ArrowUpCircle className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="text-xs text-slate-700">{p.nombre}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={runMigration}
              disabled={migrating || preview.pending.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {migrating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
              {migrating ? "Migrando..." : preview.pending.length === 0 ? "Todo migrado" : `Migrar ${preview.pending.length} producto${preview.pending.length !== 1 ? "s" : ""}`}
            </button>
            <button type="button" onClick={() => setPreview(null)} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:border-slate-400 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{results.filter((r) => r.status === "migrated").length}</p>
              <p className="text-xs text-emerald-500 mt-0.5">Migrados</p>
            </div>
            <div className={`rounded-2xl border p-3 text-center ${results.some((r) => r.status === "error") ? "border-red-100 bg-red-50" : "border-slate-100 bg-white"}`}>
              <p className={`text-2xl font-bold ${results.some((r) => r.status === "error") ? "text-red-700" : "text-slate-400"}`}>{results.filter((r) => r.status === "error").length}</p>
              <p className={`text-xs mt-0.5 ${results.some((r) => r.status === "error") ? "text-red-400" : "text-slate-400"}`}>Errores</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-1 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {r.status === "migrated" ? (
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : r.status === "error" ? (
                  <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                ) : (
                  <span className="h-3 w-3 shrink-0 inline-block rounded-full bg-slate-200" />
                )}
                <span className="text-xs text-slate-700 truncate">{r.name}</span>
                {r.status === "error" && <span className="text-xs text-red-500 truncate">{r.error}</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-emerald-600 font-semibold">
            ✓ Migración completada. Ahora podés eliminar y editar todos los productos desde el panel.
          </p>
          <button type="button" onClick={() => { setResults(null); loadPreview() }} className="text-xs text-slate-400 underline">
            Ver estado actual
          </button>
        </div>
      )}
    </SectionCard>
  )
}

// ─── COLORS SECTION ──────────────────────────────────────────────────────────

function ColoresSection() {
  const [colors, setColors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/colors")
      if (res.ok) {
        const data = await res.json()
        setColors(data.colors || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addColor = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/admin/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al crear")
      showToast(`Color "${newName.trim()}" creado.`, "ok")
      setNewName("")
      load()
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setAdding(false)
    }
  }

  const deleteColor = async (nombre: string) => {
    try {
      const res = await fetch(`/api/admin/colors?nombre=${encodeURIComponent(nombre)}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Error al eliminar")
      showToast(`Color "${nombre}" eliminado.`, "ok")
      load()
    } catch (err: any) {
      showToast(err.message, "err")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Nuevo color">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor() } }}
            placeholder="Ej: Naranja"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addColor}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {adding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </button>
        </div>
        <p className="text-xs text-slate-400">Los colores que agregues aparecen en los filtros de la página de productos.</p>
      </SectionCard>

      <SectionCard title={`Colores disponibles (${colors.length})`}>
        {colors.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No hay colores cargados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <div
                key={color}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white pl-3 pr-1.5 py-1.5"
              >
                <span className="text-sm font-medium text-slate-800">{color}</span>
                <button
                  type="button"
                  onClick={() => deleteColor(color)}
                  className="rounded-full p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  title="Eliminar color"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ${toast.type === "ok" ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
          {toast.type === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── DASHBOARD SECTION ───────────────────────────────────────────────────────

type DashboardData = {
  totalProducts: number
  totalVariants: number
  outOfStockVariants: number
  lowStockVariants: Array<{ productName: string; color: string; talle: string; stock: number }>
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  recentOrders: Array<{ id: number; created_at: string; estado: string; total: number; nombre_cliente: string | null }>
}

function DashboardSection() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="h-6 w-6 animate-spin text-slate-300" /></div>
  }
  if (!data) return null

  const fmt = (n: number) => `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`

  const statusConfig = {
    pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
    pagado: { label: "Pagado", cls: "bg-emerald-100 text-emerald-700" },
    enviado: { label: "Enviado", cls: "bg-blue-100 text-blue-700" },
    cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  } as Record<string, { label: string; cls: string }>

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Productos</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.totalProducts}</p>
          <p className="text-xs text-slate-400 mt-0.5">{data.totalVariants} variantes</p>
        </div>

        <div className={`rounded-2xl border p-4 shadow-sm ${data.outOfStockVariants > 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-white"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-4 w-4 ${data.outOfStockVariants > 0 ? "text-red-400" : "text-slate-300"}`} />
            <span className={`text-xs ${data.outOfStockVariants > 0 ? "text-red-400" : "text-slate-400"}`}>Sin stock</span>
          </div>
          <p className={`text-2xl font-bold ${data.outOfStockVariants > 0 ? "text-red-600" : "text-slate-300"}`}>{data.outOfStockVariants}</p>
          <p className={`text-xs mt-0.5 ${data.outOfStockVariants > 0 ? "text-red-400" : "text-slate-400"}`}>variantes agotadas</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Pedidos</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.totalOrders}</p>
          {data.pendingOrders > 0 && <p className="text-xs text-amber-500 mt-0.5">{data.pendingOrders} pendientes</p>}
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-600">Ventas</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">{fmt(data.totalRevenue)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">total acumulado</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Low stock alert */}
        {data.lowStockVariants.length > 0 && (
          <SectionCard title="Últimas unidades">
            <div className="space-y-2">
              {data.lowStockVariants.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{v.productName}</p>
                    <p className="text-xs text-slate-500">{v.color} · {v.talle}</p>
                  </div>
                  <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-800">{v.stock} uds</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Recent orders */}
        {data.recentOrders.length > 0 && (
          <SectionCard title="Pedidos recientes">
            <div className="space-y-2">
              {data.recentOrders.map((o) => {
                const s = statusConfig[o.estado] ?? { label: o.estado, cls: "bg-slate-100 text-slate-600" }
                return (
                  <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{o.nombre_cliente || "Cliente anónimo"}</p>
                      <p className="text-xs text-slate-400">{fmt(o.total)} · #{o.id}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {data.recentOrders.length === 0 && data.lowStockVariants.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <LayoutDashboard className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">Todo en orden. No hay alertas activas.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PEDIDOS SECTION ──────────────────────────────────────────────────────────

function PedidosSection() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "todos">("todos")

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/orders")
      if (res.ok) {
        const d = await res.json()
        setOrders(d.orders || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: number, estado: OrderStatus) => {
    setSaving(id)
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, estado } : o))
      showToast("Estado actualizado.", "ok")
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setSaving(null)
    }
  }

  const deleteOrder = async (id: number) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/orders?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      setConfirmDelete(null)
      setOrders((prev) => prev.filter((o) => o.id !== id))
      showToast("Pedido eliminado.", "ok")
    } catch (err: any) {
      showToast(err.message, "err")
    } finally {
      setDeleting(false)
    }
  }

  const fmt = (n: number) => `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })

  const statusConfig: Record<OrderStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
    pagado: { label: "Pagado", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle className="h-3 w-3" /> },
    enviado: { label: "Enviado", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <SendHorizontal className="h-3 w-3" /> },
    cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  }

  const filtered = filterStatus === "todos" ? orders : orders.filter((o) => o.estado === filterStatus)

  if (loading) return <div className="flex items-center justify-center py-24"><RefreshCw className="h-6 w-6 animate-spin text-slate-300" /></div>

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && orders.length === 0) {
    return (
      <SectionCard title="Pedidos">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500 font-medium">Los pedidos se guardan automáticamente cuando los clientes confirman por WhatsApp.</p>
          <p className="mt-1 text-xs text-slate-400">Asegurate de tener Supabase configurado para ver el historial aquí.</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(["todos", "pendiente", "pagado", "enviado", "cancelado"] as const).map((s) => {
          const count = s === "todos" ? orders.length : orders.filter((o) => o.estado === s).length
          const cfg = s === "todos" ? null : statusConfig[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filterStatus === s ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {s === "todos" ? "Todos" : cfg?.label} · {count}
            </button>
          )
        })}
        <button type="button" onClick={load} className="ml-auto rounded-full border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-700 transition">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-slate-200" />
          <p className="mt-2 text-sm text-slate-400">No hay pedidos con ese filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const s = statusConfig[order.estado]
            const isExpanded = expandedId === order.id
            return (
              <div key={order.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                {/* Order header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <ChevronRight className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{order.nombre_cliente || "Cliente anónimo"}</span>
                        <span className="text-xs text-slate-400">#{order.id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {order.telefono_cliente && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="h-3 w-3" />{order.telefono_cliente}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{fmtDate(order.created_at)}</span>
                      </div>
                    </div>
                    <span className="ml-auto text-sm font-bold text-slate-900 shrink-0">{fmt(order.total)}</span>
                  </button>

                  {/* Status selector */}
                  <div className="relative shrink-0">
                    <select
                      value={order.estado}
                      disabled={saving === order.id}
                      onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                      className={`appearance-none rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer transition ${s.cls} disabled:opacity-50`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                      <option value="enviado">Enviado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  {/* Delete */}
                  {confirmDelete === order.id ? (
                    <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 shrink-0">
                      <button type="button" onClick={() => deleteOrder(order.id)} disabled={deleting}
                        className="text-[11px] font-black text-red-600 hover:text-red-800 disabled:opacity-50">
                        {deleting ? <RefreshCw className="h-3 w-3 animate-spin inline" /> : "Sí"}
                      </button>
                      <span className="text-slate-300 text-xs">·</span>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="text-[11px] text-slate-500 hover:text-slate-700">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(order.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400 transition shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Order items (expanded) */}
                {isExpanded && (
                  <div className="border-t border-slate-50 bg-slate-50/50 px-4 py-3 space-y-2">
                    {order.items.length === 0 ? (
                      <p className="text-xs text-slate-400">Sin detalle de productos.</p>
                    ) : (
                      order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{item.nombre_producto}</span>
                          <div className="flex items-center gap-3 text-slate-500">
                            <span>{item.color} · {item.talle}</span>
                            <span>x{item.cantidad}</span>
                            <span className="font-semibold text-slate-700">{fmt(item.precio_unitario * item.cantidad)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl ${toast.type === "ok" ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
          {toast.type === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 sm:flex-none rounded-xl px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap text-center ${
        active
          ? "bg-white shadow-sm text-slate-900"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminProductForm() {
  const [tab, setTab] = useState<AdminTab>("nuevo")

  return (
    <div className="space-y-7">
      {/* Tabs — 4 cols on mobile, flex on desktop */}
      <div className="grid grid-cols-4 sm:flex gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1 w-full sm:w-fit">
        <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>Panel</TabBtn>
        <TabBtn active={tab === "nuevo"} onClick={() => setTab("nuevo")}>
          <span className="sm:hidden">Nuevo</span>
          <span className="hidden sm:inline">Nuevo producto</span>
        </TabBtn>
        <TabBtn active={tab === "stock"} onClick={() => setTab("stock")}>Stock</TabBtn>
        <TabBtn active={tab === "pedidos"} onClick={() => setTab("pedidos")}>Pedidos</TabBtn>
        {/* Last 3: span 4 cols on mobile */}
        <div className="col-span-4 sm:contents flex gap-1">
          <TabBtn active={tab === "categorias"} onClick={() => setTab("categorias")}>Categ.</TabBtn>
          <TabBtn active={tab === "colores"} onClick={() => setTab("colores")}>Colores</TabBtn>
          <TabBtn active={tab === "config"} onClick={() => setTab("config")}>
            <span className="sm:hidden">Config</span>
            <span className="hidden sm:inline">Configuración</span>
          </TabBtn>
        </div>
      </div>

      {tab === "dashboard" && <DashboardSection />}
      {tab === "nuevo" && <NewProductSection />}
      {tab === "stock" && <StockControlSection />}
      {tab === "pedidos" && <PedidosSection />}
      {tab === "categorias" && <CategoriesSection />}
      {tab === "colores" && <ColoresSection />}
      {tab === "config" && <SettingsSection />}
    </div>
  )
}
