import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { loadStockOverrides, saveStockOverrides, stockOverrideKey } from "@/lib/stock-overrides"
import { loadVariantAdditions, saveVariantAdditions } from "@/lib/variant-additions"

const PG_INT_MAX = 2_147_483_647
const isSavedProductId = (id: number) => id > PG_INT_MAX

type VariantUpdate = {
  variantId: number
  productId: number
  talle: string
  color: string
  stock: number
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const updates: VariantUpdate[] = Array.isArray(body) ? body : [body]

    if (updates.length === 0) {
      return NextResponse.json({ error: "Sin datos" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      // Fallback: persist via stock-overrides.json
      const overrides = await loadStockOverrides()
      for (const u of updates) {
        overrides[stockOverrideKey(u.productId, u.talle, u.color)] = u.stock
      }
      await saveStockOverrides(overrides)
      return NextResponse.json({ ok: true, mode: "fallback" })
    }

    // Saved-file products use timestamp productIds that exceed PG INTEGER max.
    // Route those through stock-overrides instead of DB.
    const savedUpdates = updates.filter((u) => isSavedProductId(u.productId))
    const dbUpdates = updates.filter((u) => !isSavedProductId(u.productId))

    if (savedUpdates.length > 0) {
      const overrides = await loadStockOverrides()
      for (const u of savedUpdates) {
        overrides[stockOverrideKey(u.productId, u.talle, u.color)] = Math.max(0, u.stock)
      }
      await saveStockOverrides(overrides)
    }

    for (const { variantId, stock } of dbUpdates) {
      await query(
        "UPDATE variantes_producto SET stock = $1 WHERE id = $2",
        [Math.max(0, stock), variantId]
      )
    }

    return NextResponse.json({ ok: true, mode: "db" })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { productId, talle, color, stock } = await req.json()
    if (!productId || !talle || !color || typeof stock !== "number") {
      return NextResponse.json({ error: "productId, talle, color y stock son requeridos" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      const additions = await loadVariantAdditions()
      const existing = additions.findIndex(
        (a) => a.productId === productId && a.talle === talle && a.color === color
      )
      if (existing >= 0) {
        additions[existing].stock = stock
      } else {
        additions.push({ productId, talle, color, stock })
      }
      await saveVariantAdditions(additions)

      // Also write initial stock override so it's visible immediately
      const overrides = await loadStockOverrides()
      overrides[stockOverrideKey(productId, talle, color)] = stock
      await saveStockOverrides(overrides)

      return NextResponse.json({ ok: true, mode: "fallback" })
    }

    // Saved-file products have timestamp IDs that don't fit PG INTEGER
    if (isSavedProductId(productId)) {
      const additions = await loadVariantAdditions()
      const existing = additions.findIndex(
        (a) => a.productId === productId && a.talle === talle && a.color === color
      )
      if (existing >= 0) {
        additions[existing].stock = stock
      } else {
        additions.push({ productId, talle, color, stock })
      }
      await saveVariantAdditions(additions)
      const overrides = await loadStockOverrides()
      overrides[stockOverrideKey(productId, talle, color)] = stock
      await saveStockOverrides(overrides)
      return NextResponse.json({ ok: true, mode: "saved-file" })
    }

    const existing = await query<{ id: number }>(
      "SELECT id FROM variantes_producto WHERE producto_id = $1 AND talle = $2 AND color = $3 LIMIT 1",
      [productId, talle, color]
    )
    let resultId: number
    if (existing.rows.length > 0) {
      await query("UPDATE variantes_producto SET stock = $1 WHERE id = $2", [Math.max(0, stock), existing.rows[0].id])
      resultId = existing.rows[0].id
    } else {
      const ins = await query<{ id: number }>(
        "INSERT INTO variantes_producto (producto_id, talle, color, stock) VALUES ($1, $2, $3, $4) RETURNING id",
        [productId, talle, color, Math.max(0, stock)]
      )
      resultId = ins.rows[0].id
    }
    return NextResponse.json({ ok: true, mode: "db", id: resultId })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
