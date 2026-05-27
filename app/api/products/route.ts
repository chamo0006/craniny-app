import { NextResponse } from "next/server"
import { getProducts } from "@/lib/products"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json({ products })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
