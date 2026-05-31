import { NextResponse } from "next/server"
import { getProducts } from "@/lib/products"
import { log } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json({ products })
  } catch (err: any) {
    log.error("products-public", "Error en GET /api/products", err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
