import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getProductsWithVariants } from "@/lib/products"

export async function GET() {
  try {
    const products = await getProductsWithVariants()

    const totalProducts = products.length
    const totalVariants = products.reduce((s, p) => s + p.variants.length, 0)
    const lowStockVariants = products
      .flatMap((p) =>
        p.variants
          .filter((v) => v.stock <= 3 && v.stock > 0)
          .map((v) => ({
            productName: p.name,
            color: v.color,
            talle: v.talle,
            stock: v.stock,
          }))
      )
      .slice(0, 10)
    const outOfStockVariants = products.flatMap((p) =>
      p.variants.filter((v) => v.stock === 0)
    ).length

    let totalOrders = 0
    let pendingOrders = 0
    let totalRevenue = 0
    let recentOrders: Array<{
      id: number
      created_at: string
      estado: string
      total: number
      nombre_cliente: string | null
    }> = []

    if (process.env.DATABASE_URL) {
      try {
        const ordersStats = await query<{
          total_orders: string
          pending_orders: string
          total_revenue: string
        }>(
          `SELECT
             COUNT(*)::text AS total_orders,
             COUNT(*) FILTER (WHERE estado = 'pendiente')::text AS pending_orders,
             COALESCE(SUM(total), 0)::text AS total_revenue
           FROM pedidos`
        )
        const row = ordersStats.rows[0]
        if (row) {
          totalOrders = parseInt(row.total_orders, 10)
          pendingOrders = parseInt(row.pending_orders, 10)
          totalRevenue = Number(row.total_revenue)
        }

        const recentRes = await query<{
          id: number
          created_at: string
          estado: string
          total: string
          nombre_cliente: string | null
        }>(
          `SELECT id, created_at, estado, total, nombre_cliente
           FROM pedidos ORDER BY created_at DESC LIMIT 5`
        )
        recentOrders = recentRes.rows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          estado: r.estado,
          total: Number(r.total),
          nombre_cliente: r.nombre_cliente,
        }))
      } catch {}
    }

    return NextResponse.json({
      totalProducts,
      totalVariants,
      outOfStockVariants,
      lowStockVariants,
      totalOrders,
      pendingOrders,
      totalRevenue,
      recentOrders,
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
