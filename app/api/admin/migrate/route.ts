import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import {
  fallbackProducts,
  fallbackVariants,
} from "@/lib/products"
import { loadPriceOverrides } from "@/lib/price-overrides"
import { loadMetaOverrides } from "@/lib/product-meta-overrides"
import { loadStockOverrides, getOverrideStock } from "@/lib/stock-overrides"
import { loadVariantAdditions } from "@/lib/variant-additions"
import fs from "fs/promises"
import path from "path"

const SAVED_FILE = path.join(process.cwd(), "data", "saved-products.json")

type SavedProduct = {
  id: number
  nombre: string
  descripcion?: string | null
  precio: number
  category?: string | null
  variants?: Array<{ talle?: string; color?: string; stock?: number; imagen_url?: string | null }>
}

async function loadSaved(): Promise<SavedProduct[]> {
  try {
    const raw = await fs.readFile(SAVED_FILE, "utf8").catch(() => "[]")
    return JSON.parse(raw || "[]") as SavedProduct[]
  } catch {
    return []
  }
}

async function getOrCreateCategory(nombre: string | null): Promise<number | null> {
  if (!nombre) return null
  const existing = await query<{ id: number }>(
    "SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1) LIMIT 1",
    [nombre]
  )
  if (existing.rows[0]) return existing.rows[0].id
  const inserted = await query<{ id: number }>(
    "INSERT INTO categorias (nombre) VALUES ($1) RETURNING id",
    [nombre]
  )
  return inserted.rows[0].id
}

/** GET — preview what will be migrated */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "No hay base de datos configurada." }, { status: 400 })
  }

  try {
    const saved = await loadSaved()
    const allLocal = [
      ...fallbackProducts.map((p) => ({ id: p.id, nombre: p.nombre })),
      ...saved.map((p) => ({ id: p.id, nombre: p.nombre })),
    ]

    const dbProducts = await query<{ nombre: string }>("SELECT nombre FROM productos")
    const dbNames = new Set(dbProducts.rows.map((r) => r.nombre.toLowerCase()))

    const pending = allLocal.filter((p) => !dbNames.has(p.nombre.toLowerCase()))
    const already = allLocal.filter((p) => dbNames.has(p.nombre.toLowerCase()))

    return NextResponse.json({ pending, already, total: allLocal.length })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

/** POST — execute migration */
export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "No hay base de datos configurada." }, { status: 400 })
  }

  try {
    const [saved, priceOverrides, metaOverrides, stockOverrides, variantAdditions] =
      await Promise.all([
        loadSaved(),
        loadPriceOverrides(),
        loadMetaOverrides(),
        loadStockOverrides(),
        loadVariantAdditions(),
      ])

    const dbProducts = await query<{ nombre: string, id: number }>("SELECT id, nombre FROM productos")
    const dbNames = new Set(dbProducts.rows.map((r) => r.nombre.toLowerCase()))

    const results: Array<{ name: string; status: string; newId?: number; error?: string }> = []

    // Collect all products to migrate (fallback + saved)
    type LocalProduct = {
      id: number
      nombre: string
      descripcion?: string | null
      precio: number
      category?: string | null
      variants: Array<{ talle: string; color: string; stock: number; imagen_url: string | null }>
    }

    const allLocal: LocalProduct[] = [
      ...fallbackProducts.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: null,
        precio: Number(p.precio),
        category: p.category,
        variants: fallbackVariants
          .filter((v) => v.producto_id === p.id)
          .map((v) => ({
            talle: v.talle,
            color: v.color,
            stock: v.stock,
            imagen_url: v.imagen_url,
          })),
      })),
      ...saved.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion ?? null,
        precio: Number(p.precio),
        category: p.category ?? null,
        variants: (p.variants || []).map((v) => ({
          talle: v.talle || "",
          color: v.color || "",
          stock: v.stock || 0,
          imagen_url: v.imagen_url || null,
        })),
      })),
    ]

    for (const product of allLocal) {
      if (dbNames.has(product.nombre.toLowerCase())) {
        results.push({ name: product.nombre, status: "already_exists" })
        continue
      }

      try {
        // Resolve price with override
        const precio = priceOverrides[product.id] ?? product.precio

        // Resolve name with meta override
        const meta = metaOverrides[String(product.id)]
        const nombre = meta?.nombre ?? product.nombre

        // Get or create category
        const categoriaId = await getOrCreateCategory(product.category ?? null)

        // Insert product
        const insertRes = await query<{ id: number }>(
          "INSERT INTO productos (nombre, descripcion, precio, categoria_id) VALUES ($1, $2, $3, $4) RETURNING id",
          [nombre, product.descripcion, precio, categoriaId]
        )
        const newId = insertRes.rows[0].id

        // Collect variant additions for this product
        const additions = variantAdditions
          .filter((a) => a.productId === product.id)
          .map((a) => ({
            talle: a.talle,
            color: a.color,
            stock: a.stock,
            imagen_url: a.imagen_url ?? null,
          }))

        const allVariants = [...product.variants, ...additions]

        // Build color→image map from meta overrides
        const metaImages = meta?.imagenes ?? []
        const uniqueColors = [...new Set(allVariants.map((v) => v.color))]
        const colorImageMap = new Map<string, string | null>()
        uniqueColors.forEach((color, i) => {
          colorImageMap.set(color, metaImages[i] ?? null)
        })

        // Insert variants with resolved stock and image
        for (const v of allVariants) {
          const stock = getOverrideStock(stockOverrides, product.id, v.talle, v.color, v.stock)
          const imagen = colorImageMap.get(v.color) ?? v.imagen_url

          await query(
            "INSERT INTO variantes_producto (producto_id, talle, color, stock, imagen_url) VALUES ($1, $2, $3, $4, $5)",
            [newId, v.talle, v.color, Math.max(0, stock), imagen]
          )
        }

        // Insert product meta (imagenes, nombre override)
        if (metaImages.length > 0 || meta?.imagen_url) {
          await query(
            `INSERT INTO product_meta (product_id, nombre, imagen_url, imagenes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (product_id) DO UPDATE
               SET nombre = EXCLUDED.nombre,
                   imagen_url = EXCLUDED.imagen_url,
                   imagenes = EXCLUDED.imagenes`,
            [newId, meta?.nombre ?? null, meta?.imagen_url ?? null, metaImages]
          )
        }

        results.push({ name: nombre, status: "migrated", newId })
        dbNames.add(nombre.toLowerCase())
      } catch (err: any) {
        results.push({ name: product.nombre, status: "error", error: String(err.message ?? err) })
      }
    }

    const migrated = results.filter((r) => r.status === "migrated").length
    const errors = results.filter((r) => r.status === "error").length

    return NextResponse.json({ ok: true, migrated, errors, results })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
