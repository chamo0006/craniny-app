import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { loadStockOverrides, saveStockOverrides, stockOverrideKey } from "@/lib/stock-overrides"
import { loadVariantAdditions, saveVariantAdditions } from "@/lib/variant-additions"

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

    // DB mode: update each variant row
    for (const { variantId, stock } of updates) {
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

    const res = await query(
      "INSERT INTO variantes_producto (producto_id, talle, color, stock) VALUES ($1, $2, $3, $4) ON CONFLICT (producto_id, talle, color) DO UPDATE SET stock = EXCLUDED.stock RETURNING id",
      [productId, talle, color, Math.max(0, stock)]
    )
    return NextResponse.json({ ok: true, mode: "db", id: res.rows[0]?.id })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
