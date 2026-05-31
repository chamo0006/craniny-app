import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { log } from "@/lib/logger"
import { getCategories, fallbackCategories } from "@/lib/products"
import { loadCatOverrides, saveCatOverrides } from "@/lib/categories-overrides"
import fs from "fs/promises"
import path from "path"

const SAVED_FILE = path.join(process.cwd(), "data", "saved-products.json")

export async function GET() {
  try {
    const categories = await getCategories()
    return NextResponse.json({ categories })
  } catch (err: any) {
    log.error("categories", "Error en GET /api/admin/categories", err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { nombre } = await req.json()
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      const overrides = await loadCatOverrides()
      const trimmed = nombre.trim()

      // Gather all known category names (fallback + added + inferred from saved products)
      let savedCatNames: string[] = []
      try {
        const raw = await fs.readFile(SAVED_FILE, "utf8").catch(() => "[]")
        const savedProds: { category?: string | null }[] = JSON.parse(raw || "[]")
        savedCatNames = [...new Set(savedProds.map((p) => p.category).filter(Boolean) as string[])]
      } catch {}

      const allNames = [
        ...fallbackCategories.map((c) => c.nombre.toLowerCase()),
        ...overrides.added.map((c) => c.nombre.toLowerCase()),
        ...savedCatNames.map((n) => n.toLowerCase()),
      ]
      if (allNames.includes(trimmed.toLowerCase())) {
        return NextResponse.json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 })
      }
      const newId = Date.now()
      overrides.added.push({ id: newId, nombre: trimmed })
      await saveCatOverrides(overrides)
      return NextResponse.json({ category: { id: newId, nombre: trimmed } })
    }

    const existing = await query("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1) LIMIT 1", [nombre.trim()])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 })
    }
    const result = await query(
      "INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre",
      [nombre.trim()]
    )
    return NextResponse.json({ category: result.rows[0] })
  } catch (err: any) {
    log.error("categories", "Error en POST /api/admin/categories", err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { order } = await req.json()
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order debe ser un array de nombres" }, { status: 400 })
    }

    const cleanOrder = order.map(String)

    if (!process.env.DATABASE_URL) {
      // Fallback: persist in categories-overrides.json
      const overrides = await loadCatOverrides()
      overrides.order = cleanOrder
      await saveCatOverrides(overrides)
      return NextResponse.json({ ok: true })
    }

    // DB mode: persist order inside site_settings JSONB (no schema change needed)
    await query(
      `INSERT INTO site_settings (id, data)
       VALUES (1, jsonb_build_object('categoryOrder', $1::jsonb))
       ON CONFLICT (id) DO UPDATE
         SET data = site_settings.data || jsonb_build_object('categoryOrder', $1::jsonb)`,
      [JSON.stringify(cleanOrder)]
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    log.error("categories", "Error en PATCH /api/admin/categories", err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get("id") ?? "", 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      const overrides = await loadCatOverrides()
      const isHardcoded = fallbackCategories.some((c) => c.id === id)
      const isAdded = overrides.added.some((c) => c.id === id)

      // Also check categories inferred from saved products (identified by stable id >= 3000)
      let savedCatName: string | null = null
      if (!isHardcoded && !isAdded && id >= 3000) {
        try {
          const raw = await fs.readFile(SAVED_FILE, "utf8").catch(() => "[]")
          const savedProds: { category?: string | null }[] = JSON.parse(raw || "[]")
          const savedNames = [...new Set(savedProds.map((p) => p.category).filter(Boolean) as string[])]
          const stableId = (name: string): number => {
            let h = 3000
            for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
            return Math.abs(h) + 3000
          }
          savedCatName = savedNames.find((n) => stableId(n) === id) ?? null
        } catch {}
      }

      if (!isHardcoded && !isAdded && !savedCatName) {
        return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 })
      }
      if (isAdded) {
        overrides.added = overrides.added.filter((c) => c.id !== id)
      } else if (isHardcoded) {
        if (!overrides.deleted.includes(id)) overrides.deleted.push(id)
      }
      // For savedCat: removing it from the order list is enough; it'll auto-disappear when no product uses it
      if (savedCatName) {
        overrides.order = overrides.order.filter((n) => n !== savedCatName)
      }
      await saveCatOverrides(overrides)
      return NextResponse.json({ ok: true })
    }

    const check = await query<{ count: string }>(
      "SELECT COUNT(*) FROM productos WHERE categoria_id = $1",
      [id]
    )
    const count = parseInt(check.rows[0]?.count ?? "0", 10)
    if (count > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: hay ${count} producto${count !== 1 ? "s" : ""} en esta categoría. Reasignálos primero.`,
          hasProducts: true,
          count,
        },
        { status: 409 }
      )
    }
    await query("DELETE FROM categorias WHERE id = $1", [id])
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    log.error("categories", "Error en DELETE /api/admin/categories", err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
