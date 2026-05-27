import fs from "fs/promises"
import path from "path"

const FILE = path.join(process.cwd(), "data", "categories-overrides.json")

export type CatOverrides = {
  added: { id: number; nombre: string }[]
  deleted: number[]
  order: string[]
}

export async function loadCatOverrides(): Promise<CatOverrides> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const d = JSON.parse(raw || "{}") as Partial<CatOverrides>
    return { added: d.added ?? [], deleted: d.deleted ?? [], order: d.order ?? [] }
  } catch {
    return { added: [], deleted: [], order: [] }
  }
}

export async function saveCatOverrides(data: CatOverrides): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8")
}
