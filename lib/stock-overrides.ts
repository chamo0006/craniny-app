import fs from "fs/promises"
import path from "path"

export type StockOverrideKey = {
  productId: number
  talle: string
  color: string
}

const STOCK_FILE = path.join(process.cwd(), "data", "stock-overrides.json")

export function stockOverrideKey(productId: number, talle: string, color: string): string {
  return `${productId}|${talle}|${color}`
}

export async function loadStockOverrides(): Promise<Record<string, number>> {
  try {
    const raw = await fs.readFile(STOCK_FILE, "utf8")
    return JSON.parse(raw || "{}") as Record<string, number>
  } catch {
    return {}
  }
}

export async function saveStockOverrides(overrides: Record<string, number>) {
  await fs.mkdir(path.dirname(STOCK_FILE), { recursive: true })
  await fs.writeFile(STOCK_FILE, JSON.stringify(overrides, null, 2), "utf8")
}

export async function decrementStockOverrides(
  items: Array<{ id: number; selectedSize?: string | null; selectedColor?: string | null; quantity: number }>,
  getBaseStock: (productId: number, talle: string, color: string) => number
) {
  const overrides = await loadStockOverrides()
  for (const item of items) {
    const talle = item.selectedSize || ""
    const color = item.selectedColor || ""
    const key = stockOverrideKey(item.id, talle, color)
    const current = key in overrides ? overrides[key] : getBaseStock(item.id, talle, color)
    overrides[key] = Math.max(0, current - item.quantity)
  }
  await saveStockOverrides(overrides)
  return overrides
}

export function getOverrideStock(
  overrides: Record<string, number>,
  productId: number,
  talle: string,
  color: string,
  defaultStock: number
): number {
  const key = stockOverrideKey(productId, talle, color)
  if (key in overrides) {
    return overrides[key]
  }
  return defaultStock
}
