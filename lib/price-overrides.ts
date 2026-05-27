import fs from "fs/promises"
import path from "path"

const FILE = path.join(process.cwd(), "data", "price-overrides.json")

export async function loadPriceOverrides(): Promise<Record<number, number>> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    return JSON.parse(raw || "{}") as Record<number, number>
  } catch {
    return {}
  }
}

export async function savePriceOverrides(overrides: Record<number, number>): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(overrides, null, 2), "utf8")
}
