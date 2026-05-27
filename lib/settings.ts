import fs from "fs/promises"
import path from "path"
import { query } from "./db"

const FILE = path.join(process.cwd(), "data", "settings.json")

export type ProductSettings = {
  discountType?: "transferencia" | "efectivo"
  discountPercent?: number
  freeShipping?: boolean
}

export type SiteSettings = {
  defaultDiscountType: "transferencia" | "efectivo"
  defaultDiscountPercent: number
  freeShippingThreshold: number
  products: Record<string, ProductSettings>
}

export function resolveProductSettings(
  settings: SiteSettings,
  productId: number
): { discountType: "transferencia" | "efectivo"; discountPercent: number; freeShipping: boolean } {
  const override = settings.products[String(productId)] ?? {}
  return {
    discountType: override.discountType ?? settings.defaultDiscountType,
    discountPercent: override.discountPercent ?? settings.defaultDiscountPercent,
    freeShipping: override.freeShipping ?? false,
  }
}

const DEFAULTS: SiteSettings = {
  defaultDiscountType: "transferencia",
  defaultDiscountPercent: 20,
  freeShippingThreshold: 180000,
  products: {},
}

function parseSettings(d: Partial<SiteSettings>): SiteSettings {
  return {
    defaultDiscountType: d.defaultDiscountType ?? "transferencia",
    defaultDiscountPercent: typeof d.defaultDiscountPercent === "number" ? d.defaultDiscountPercent : 20,
    freeShippingThreshold: typeof d.freeShippingThreshold === "number" ? d.freeShippingThreshold : 180000,
    products: d.products ?? {},
  }
}

export async function loadSettings(): Promise<SiteSettings> {
  if (process.env.DATABASE_URL) {
    try {
      const result = await query<{ data: Partial<SiteSettings> }>(
        "SELECT data FROM site_settings WHERE id = 1"
      )
      if (result.rows.length === 0) return DEFAULTS
      return parseSettings(result.rows[0].data)
    } catch {
      return DEFAULTS
    }
  }

  try {
    const raw = await fs.readFile(FILE, "utf8")
    return parseSettings(JSON.parse(raw || "{}") as Partial<SiteSettings>)
  } catch {
    return DEFAULTS
  }
}

export async function saveSettings(data: SiteSettings): Promise<void> {
  if (process.env.DATABASE_URL) {
    await query(
      `INSERT INTO site_settings (id, data) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [JSON.stringify(data)]
    )
    return
  }

  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8")
}
