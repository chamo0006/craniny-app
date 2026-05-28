import fs from "fs/promises"
import path from "path"
import { query } from "./db"

const FILE = path.join(process.cwd(), "data", "colors.json")
const COLORS_ROW_ID = 2

export const DEFAULT_COLORS = [
  "Negro", "Blanco", "Gris", "Rojo", "Azul",
  "Verde", "Beige", "Oliva", "Bordo", "Celeste",
]

export async function loadColors(): Promise<string[]> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await query<{ data: { colors: string[] } }>(
        "SELECT data FROM site_settings WHERE id = $1",
        [COLORS_ROW_ID]
      )
      if (res.rows.length > 0 && Array.isArray(res.rows[0].data?.colors)) {
        return res.rows[0].data.colors
      }
      return DEFAULT_COLORS
    } catch {
      return DEFAULT_COLORS
    }
  }

  try {
    const raw = await fs.readFile(FILE, "utf8")
    const d = JSON.parse(raw || "{}") as { colors?: string[] }
    return Array.isArray(d.colors) && d.colors.length > 0 ? d.colors : DEFAULT_COLORS
  } catch {
    return DEFAULT_COLORS
  }
}

export async function saveColors(colors: string[]): Promise<void> {
  if (process.env.DATABASE_URL) {
    await query(
      "INSERT INTO site_settings (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
      [COLORS_ROW_ID, JSON.stringify({ colors })]
    )
    return
  }

  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify({ colors }, null, 2), "utf8")
}
