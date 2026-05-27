import fs from "fs/promises"
import path from "path"
import { query } from "./db"

const FILE = path.join(process.cwd(), "data", "product-meta-overrides.json")

export type MetaOverride = {
  nombre?: string
  imagen_url?: string
  imagenes?: string[]
}

export type MetaOverrides = Record<string, MetaOverride>

export async function loadMetaOverrides(): Promise<MetaOverrides> {
  if (process.env.DATABASE_URL) {
    try {
      const result = await query<{ product_id: number; nombre: string | null; imagen_url: string | null; imagenes: string[] | null }>(
        "SELECT product_id, nombre, imagen_url, imagenes FROM product_meta"
      )
      const out: MetaOverrides = {}
      for (const row of result.rows) {
        out[String(row.product_id)] = {
          ...(row.nombre != null && { nombre: row.nombre }),
          ...(row.imagen_url != null && { imagen_url: row.imagen_url }),
          ...(row.imagenes != null && { imagenes: row.imagenes }),
        }
      }
      return out
    } catch {
      return {}
    }
  }

  try {
    const raw = await fs.readFile(FILE, "utf8")
    return JSON.parse(raw || "{}") as MetaOverrides
  } catch {
    return {}
  }
}

export async function saveMetaOverrides(data: MetaOverrides): Promise<void> {
  if (process.env.DATABASE_URL) {
    for (const [key, meta] of Object.entries(data)) {
      const productId = parseInt(key, 10)
      if (isNaN(productId)) continue
      await query(
        `INSERT INTO product_meta (product_id, nombre, imagen_url, imagenes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id) DO UPDATE
           SET nombre = EXCLUDED.nombre,
               imagen_url = EXCLUDED.imagen_url,
               imagenes = EXCLUDED.imagenes`,
        [productId, meta.nombre ?? null, meta.imagen_url ?? null, meta.imagenes ?? null]
      )
    }
    return
  }

  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8")
}
