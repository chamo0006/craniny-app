import { NextResponse } from "next/server"
import { loadSettings, saveSettings } from "@/lib/settings"

export async function GET() {
  try {
    const settings = await loadSettings()
    return NextResponse.json(settings)
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const settings = await loadSettings()

    // Update global defaults
    if (body.global) {
      const g = body.global
      if (typeof g.defaultDiscountType === "string" && ["transferencia", "efectivo"].includes(g.defaultDiscountType)) {
        settings.defaultDiscountType = g.defaultDiscountType
      }
      if (typeof g.defaultDiscountPercent === "number" && g.defaultDiscountPercent >= 0 && g.defaultDiscountPercent <= 80) {
        settings.defaultDiscountPercent = g.defaultDiscountPercent
      }
      if (typeof g.freeShippingThreshold === "number" && g.freeShippingThreshold >= 0) {
        settings.freeShippingThreshold = g.freeShippingThreshold
      }
    }

    // Update a specific product override
    if (typeof body.productId === "number") {
      const id = String(body.productId)
      const existing = settings.products[id] ?? {}
      const updated: typeof existing = { ...existing }

      if (typeof body.discountType === "string" && ["transferencia", "efectivo"].includes(body.discountType)) {
        updated.discountType = body.discountType
      }
      if (typeof body.discountPercent === "number" && body.discountPercent >= 0 && body.discountPercent <= 80) {
        updated.discountPercent = body.discountPercent
      }
      if (typeof body.freeShipping === "boolean") {
        updated.freeShipping = body.freeShipping
      }

      // Only store override if it differs from empty object
      if (Object.keys(updated).length > 0) {
        settings.products[id] = updated
      }
    }

    // Remove a product override completely
    if (typeof body.deleteProductId === "number") {
      delete settings.products[String(body.deleteProductId)]
    }

    await saveSettings(settings)
    return NextResponse.json(settings)
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
