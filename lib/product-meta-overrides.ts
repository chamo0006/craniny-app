import fs from "fs/promises"
import path from "path"

const FILE = path.join(process.cwd(), "data", "product-meta-overrides.json")

export type MetaOverride = {
  nombre?: string
  imagen_url?: string
  imagenes?: string[]
}

export type MetaOverrides = Record<string, MetaOverride>

export async function loadMetaOverrides(): Promise<MetaOverrides> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    return JSON.parse(raw || "{}") as MetaOverrides
  } catch {
    return {}
  }
}

export async function saveMetaOverrides(data: MetaOverrides): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8")
}
