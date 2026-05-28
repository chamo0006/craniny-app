import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getFallbackBaseStock } from "@/lib/products"
import { decrementStockOverrides } from "@/lib/stock-overrides"
import fs from "fs/promises"
import path from "path"

const SAVED_FILE = path.join(process.cwd(), "data", "saved-products.json")

async function loadSaved() {
  try {
    const raw = await fs.readFile(SAVED_FILE, "utf8")
    return JSON.parse(raw || "[]")
  } catch {
    return []
  }
}

async function saveSaved(arr: unknown[]) {
  await fs.mkdir(path.dirname(SAVED_FILE), { recursive: true })
  await fs.writeFile(SAVED_FILE, JSON.stringify(arr, null, 2), "utf8")
}

type CheckoutItem = {
  id: number
  nombre?: string
  price?: number
  selectedSize?: string | null
  selectedColor?: string | null
  quantity: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const items: CheckoutItem[] = body.items || []
    const nombre_cliente: string | null = body.nombre_cliente || null
    const telefono_cliente: string | null = body.telefono_cliente || null
    const total: number = body.total || 0

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No hay items" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      // Fallback: decrement stock in local files
      await decrementStockOverrides(items, getFallbackBaseStock)

      const saved = await loadSaved()
      for (const it of items) {
        const prod = saved.find((p: { id: number }) => p.id === it.id)
        if (!prod || !Array.isArray(prod.variants)) continue
        const variant = prod.variants.find(
          (v: { talle?: string; color?: string }) =>
            (v.talle || "") === (it.selectedSize || "") &&
            (v.color || "") === (it.selectedColor || "")
        )
        if (variant) {
          variant.stock = Math.max(0, (variant.stock || 0) - it.quantity)
        } else {
          const bySize = prod.variants.find(
            (v: { talle?: string }) => (v.talle || "") === (it.selectedSize || "")
          )
          if (bySize) {
            bySize.stock = Math.max(0, (bySize.stock || 0) - it.quantity)
          }
        }
      }
      await saveSaved(saved)
      return NextResponse.json({ ok: true, fallback: true })
    }

    // DB mode
    try {
      await query("BEGIN")

      // 1. Decrement stock for each item
      const updated: Array<{ variantId: number; stock: number }> = []
      for (const it of items) {
        const res = await query<{ id: number; stock: number }>(
          `SELECT id, stock FROM variantes_producto
           WHERE producto_id = $1
             AND COALESCE(talle, '') = COALESCE($2, '')
             AND COALESCE(color, '') = COALESCE($3, '')
           LIMIT 1`,
          [it.id, it.selectedSize || "", it.selectedColor || ""]
        )
        const variant = res.rows[0]
        if (variant) {
          const newStock = Math.max(0, variant.stock - it.quantity)
          await query("UPDATE variantes_producto SET stock = $1 WHERE id = $2", [newStock, variant.id])
          updated.push({ variantId: variant.id, stock: newStock })
        } else {
          const r2 = await query<{ id: number; stock: number }>(
            `SELECT id, stock FROM variantes_producto
             WHERE producto_id = $1
               AND COALESCE(talle, '') = COALESCE($2, '')
             LIMIT 1`,
            [it.id, it.selectedSize || ""]
          )
          const v2 = r2.rows[0]
          if (v2) {
            const newStock = Math.max(0, v2.stock - it.quantity)
            await query("UPDATE variantes_producto SET stock = $1 WHERE id = $2", [newStock, v2.id])
            updated.push({ variantId: v2.id, stock: newStock })
          }
        }
      }

      // 2. Save order
      const orderRes = await query<{ id: number }>(
        `INSERT INTO pedidos (estado, total, nombre_cliente, telefono_cliente)
         VALUES ('pendiente', $1, $2, $3)
         RETURNING id`,
        [total, nombre_cliente, telefono_cliente]
      )
      const orderId = orderRes.rows[0]?.id

      // 3. Save order items
      if (orderId) {
        for (const it of items) {
          await query(
            `INSERT INTO pedido_items
               (pedido_id, producto_id, nombre_producto, talle, color, cantidad, precio_unitario)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              orderId,
              it.id,
              it.nombre || "Producto",
              it.selectedSize || "",
              it.selectedColor || "",
              it.quantity,
              it.price || 0,
            ]
          )
        }
      }

      await query("COMMIT")
      return NextResponse.json({ ok: true, orderId, updated })
    } catch (dbErr) {
      await query("ROLLBACK")
      return NextResponse.json({ ok: false, error: String(dbErr) }, { status: 500 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
