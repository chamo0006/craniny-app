import fs from "fs/promises"
import path from "path"

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

export async function loadSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const d = JSON.parse(raw || "{}") as Partial<SiteSettings>
    return {
      defaultDiscountType: d.defaultDiscountType ?? "transferencia",
      defaultDiscountPercent: typeof d.defaultDiscountPercent === "number" ? d.defaultDiscountPercent : 20,
      freeShippingThreshold: typeof d.freeShippingThreshold === "number" ? d.freeShippingThreshold : 180000,
      products: d.products ?? {},
    }
  } catch {
    return { defaultDiscountType: "transferencia", defaultDiscountPercent: 20, freeShippingThreshold: 180000, products: {} }
  }
}

export async function saveSettings(data: SiteSettings): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8")
}
