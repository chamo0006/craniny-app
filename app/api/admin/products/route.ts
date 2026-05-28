import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getProductsWithVariants } from '@/lib/products'
import { loadPriceOverrides, savePriceOverrides } from '@/lib/price-overrides'
import { loadMetaOverrides, saveMetaOverrides } from '@/lib/product-meta-overrides'
import fs from 'fs/promises'
import path from 'path'

const SAVED_FILE_PATH = path.join(process.cwd(), 'data', 'saved-products.json')

// PostgreSQL INTEGER max. IDs created with Date.now() (~1.77T) exceed this.
const PG_INT_MAX = 2_147_483_647

/** Returns true if this ID belongs to a saved-file product (not a DB row) */
const isSavedId = (id: number) => id > PG_INT_MAX

export async function GET() {
  try {
    const products = await getProductsWithVariants()
    return NextResponse.json({ products })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

type VariantInput = { talle?: string; color?: string; stock?: number; imagen_url?: string | null }

const SAVED_FILE = path.join(process.cwd(), 'data', 'saved-products.json')

async function appendSavedProduct(product: any) {
  try {
    const raw = await fs.readFile(SAVED_FILE, 'utf8')
    const arr = JSON.parse(raw || '[]')
    arr.push(product)
    await fs.writeFile(SAVED_FILE, JSON.stringify(arr, null, 2), 'utf8')
  } catch (e) {
    // attempt to create file
    await fs.writeFile(SAVED_FILE, JSON.stringify([product], null, 2), 'utf8')
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, descripcion, precio, categoria, variants } = body

    if (!nombre || typeof precio !== 'number') {
      return NextResponse.json({ error: 'nombre y precio son obligatorios' }, { status: 400 })
    }

    // If no DATABASE_URL, fallback to local file storage
    if (!process.env.DATABASE_URL) {
      // compute an id based on timestamp
      const id = Date.now()
      const savedProduct = { id, nombre, descripcion: descripcion || null, precio, category: categoria || null, variants: Array.isArray(variants) ? variants : [] }
      await appendSavedProduct(savedProduct)
      return NextResponse.json({ ok: true, id })
    }

    // Try DB insert, fall back to file on error
    try {
      let categoriaId: number | null = null
      if (categoria) {
        const catRes = await query('SELECT id FROM categorias WHERE nombre = $1 LIMIT 1', [categoria])
        if (catRes.rows[0]) {
          categoriaId = catRes.rows[0].id
        } else {
          const insertCat = await query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [categoria])
          categoriaId = insertCat.rows[0].id
        }
      }

      const insertProduct = await query(
        'INSERT INTO productos (nombre, descripcion, precio, categoria_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [nombre, descripcion || null, precio, categoriaId]
      )

      const productId = insertProduct.rows[0].id

      if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants as VariantInput[]) {
          await query(
            'INSERT INTO variantes_producto (producto_id, talle, color, stock, imagen_url) VALUES ($1, $2, $3, $4, $5)',
            [productId, v.talle || null, v.color || null, v.stock || 0, v.imagen_url || null]
          )
        }
      }

      return NextResponse.json({ ok: true, id: productId })
    } catch (dbErr) {
      // fallback to file storage
      const id = Date.now()
      const savedProduct = { id, nombre, descripcion: descripcion || null, precio, category: categoria || null, variants: Array.isArray(variants) ? variants : [] }
      await appendSavedProduct(savedProduct)
      return NextResponse.json({ ok: true, id, fallback: true })
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const updates: { id: number; precio?: number; nombre?: string; imagen_url?: string; imagenes?: string[] }[] =
      Array.isArray(body) ? body : [body]

    if (updates.length === 0) {
      return NextResponse.json({ error: "Sin datos" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      const priceUpdates = updates.filter((u) => typeof u.precio === "number")
      if (priceUpdates.length > 0) {
        const overrides = await loadPriceOverrides()
        for (const { id, precio } of priceUpdates) {
          overrides[id] = Math.max(0, precio!)
        }
        await savePriceOverrides(overrides)
      }

      const metaUpdates = updates.filter((u) => u.nombre !== undefined || u.imagen_url !== undefined || u.imagenes !== undefined)
      if (metaUpdates.length > 0) {
        const overrides = await loadMetaOverrides()
        for (const { id, nombre, imagen_url, imagenes } of metaUpdates) {
          const key = String(id)
          const existing = overrides[key] ?? {}
          if (nombre !== undefined) existing.nombre = nombre
          if (imagen_url !== undefined) existing.imagen_url = imagen_url
          if (imagenes !== undefined) existing.imagenes = imagenes
          overrides[key] = existing
        }
        await saveMetaOverrides(overrides)
      }

      return NextResponse.json({ ok: true, mode: "fallback" })
    }

    // Saved-file products (timestamp IDs) can't be stored in PG INTEGER columns.
    // Route them through override files instead.
    const savedFileUpdates = updates.filter((u) => isSavedId(u.id))
    const dbUpdates = updates.filter((u) => !isSavedId(u.id))

    if (savedFileUpdates.length > 0) {
      const priceUpdates = savedFileUpdates.filter((u) => typeof u.precio === "number")
      if (priceUpdates.length > 0) {
        const priceOverrides = await loadPriceOverrides()
        for (const { id, precio } of priceUpdates) priceOverrides[id] = Math.max(0, precio!)
        await savePriceOverrides(priceOverrides)
      }
      const metaUpdates = savedFileUpdates.filter((u) => u.nombre !== undefined || u.imagen_url !== undefined || u.imagenes !== undefined)
      if (metaUpdates.length > 0) {
        const metaOverrides = await loadMetaOverrides()
        for (const { id, nombre, imagen_url, imagenes } of metaUpdates) {
          const key = String(id)
          const existing = metaOverrides[key] ?? {}
          if (nombre !== undefined) existing.nombre = nombre
          if (imagen_url !== undefined) existing.imagen_url = imagen_url
          if (imagenes !== undefined) existing.imagenes = imagenes
          metaOverrides[key] = existing
        }
        await saveMetaOverrides(metaOverrides)
      }
    }

    for (const { id, precio, nombre, imagen_url } of dbUpdates) {
      if (typeof precio === "number") {
        await query("UPDATE productos SET precio = $1 WHERE id = $2", [Math.max(0, precio), id])
      }
      if (nombre !== undefined) {
        await query("UPDATE productos SET nombre = $1 WHERE id = $2", [nombre, id])
      }
      if (imagen_url !== undefined) {
        await query("UPDATE variantes_producto SET imagen_url = $1 WHERE producto_id = $2", [imagen_url, id])
      }
    }
    return NextResponse.json({ ok: true, mode: "db" })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

async function deleteFromSavedFile(id: number): Promise<"deleted" | "not_found" | "readonly"> {
  try {
    const raw = await fs.readFile(SAVED_FILE_PATH, "utf8").catch(() => "[]")
    const saved: { id: number }[] = JSON.parse(raw || "[]")
    const filtered = saved.filter((p) => p.id !== id)
    if (filtered.length === saved.length) return "not_found"
    await fs.writeFile(SAVED_FILE_PATH, JSON.stringify(filtered, null, 2), "utf8")
    return "deleted"
  } catch {
    return "readonly"
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get("id") ?? "", 10)
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    if (!process.env.DATABASE_URL) {
      const result = await deleteFromSavedFile(id)
      if (result === "not_found") {
        return NextResponse.json(
          { error: "Este producto es de demo y no se puede eliminar sin base de datos configurada." },
          { status: 404 }
        )
      }
      if (result === "readonly") {
        return NextResponse.json(
          { error: "No se puede eliminar: el servidor no tiene acceso de escritura. Configurá Supabase para habilitar esta función." },
          { status: 500 }
        )
      }
      return NextResponse.json({ ok: true, mode: "fallback" })
    }

    let deletedFromDb = false

    if (!isSavedId(id)) {
      // Only query the DB when ID fits in PG INTEGER
      await query("DELETE FROM variantes_producto WHERE producto_id = $1", [id])
      const prodRes = await query("DELETE FROM productos WHERE id = $1", [id])
      deletedFromDb = (prodRes.rowCount ?? 0) > 0
    }

    // Always also try to remove from saved-products.json (covers timestamp IDs and fallback-mode products)
    await deleteFromSavedFile(id)

    return NextResponse.json({ ok: true, mode: deletedFromDb ? "db" : "saved-file" })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
