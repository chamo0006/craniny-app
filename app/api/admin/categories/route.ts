import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getCategories, fallbackCategories } from "@/lib/products"
import { loadCatOverrides, saveCatOverrides } from "@/lib/categories-overrides"

export async function GET() {
  try {
    const categories = await getCategories()
    return NextResponse.json({ categories })
  } catch (err: any) {
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
      const allNames = [
        ...fallbackCategories.map((c) => c.nombre.toLowerCase()),
        ...overrides.added.map((c) => c.nombre.toLowerCase()),
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
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { order } = await req.json()
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order debe ser un array de nombres" }, { status: 400 })
    }
    if (!process.env.DATABASE_URL) {
      const overrides = await loadCatOverrides()
      overrides.order = order.map(String)
      await saveCatOverrides(overrides)
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
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
      if (!isHardcoded && !isAdded) {
        return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 })
      }
      if (isAdded) {
        overrides.added = overrides.added.filter((c) => c.id !== id)
      } else {
        if (!overrides.deleted.includes(id)) overrides.deleted.push(id)
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
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
