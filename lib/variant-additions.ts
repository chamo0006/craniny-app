import fs from "fs/promises"
import path from "path"

const FILE = path.join(process.cwd(), "data", "variant-additions.json")

export type VariantAddition = {
  productId: number
  talle: string
  color: string
  stock: number
  imagen_url?: string | null
}

export async function loadVariantAdditions(): Promise<VariantAddition[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    return JSON.parse(raw || "[]") as VariantAddition[]
  } catch {
    return []
  }
}

export async function saveVariantAdditions(data: VariantAddition[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8")
}
