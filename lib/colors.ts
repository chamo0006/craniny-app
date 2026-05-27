import fs from "fs/promises"
import path from "path"

const FILE = path.join(process.cwd(), "data", "colors.json")

const DEFAULT_COLORS = [
  "Negro", "Blanco", "Gris", "Rojo", "Azul",
  "Verde", "Beige", "Oliva", "Bordo", "Celeste",
]

export async function loadColors(): Promise<string[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const d = JSON.parse(raw || "{}") as { colors?: string[] }
    return Array.isArray(d.colors) && d.colors.length > 0 ? d.colors : DEFAULT_COLORS
  } catch {
    return DEFAULT_COLORS
  }
}

export async function saveColors(colors: string[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify({ colors }, null, 2), "utf8")
}
