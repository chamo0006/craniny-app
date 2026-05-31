import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { log } from "@/lib/logger"

export type OrderStatus = "pendiente" | "pagado" | "enviado" | "cancelado"

export type Order = {
  id: number
  created_at: string
  estado: OrderStatus
  total: number
  nombre_cliente: string | null
  telefono_cliente: string | null
  notas: string | null
  items: OrderItem[]
}

export type OrderItem = {
  id: number
  pedido_id: number
  producto_id: number | null
  nombre_producto: string
  talle: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ orders: [] })
  }

  try {
    const ordersRes = await query<{
      id: number
      created_at: string
      estado: OrderStatus
      total: string
      nombre_cliente: string | null
      telefono_cliente: string | null
      notas: string | null
    }>(
      `SELECT id, created_at, estado, total, nombre_cliente, telefono_cliente, notas
       FROM pedidos
       ORDER BY created_at DESC
       LIMIT 200`
    )

    if (ordersRes.rows.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    const orderIds = ordersRes.rows.map((o) => o.id)
    const itemsRes = await query<{
      id: number
      pedido_id: number
      producto_id: number | null
      nombre_producto: string
      talle: string | null
      color: string | null
      cantidad: number
      precio_unitario: string
    }>(
      `SELECT id, pedido_id, producto_id, nombre_producto, talle, color, cantidad, precio_unitario
       FROM pedido_items
       WHERE pedido_id = ANY($1)
       ORDER BY id`,
      [orderIds]
    )

    const itemsByOrder = new Map<number, OrderItem[]>()
    for (const row of itemsRes.rows) {
      const item: OrderItem = {
        id: row.id,
        pedido_id: row.pedido_id,
        producto_id: row.producto_id,
        nombre_producto: row.nombre_producto,
        talle: row.talle,
        color: row.color,
        cantidad: row.cantidad,
        precio_unitario: Number(row.precio_unitario),
      }
      const list = itemsByOrder.get(row.pedido_id) ?? []
      list.push(item)
      itemsByOrder.set(row.pedido_id, list)
    }

    const orders: Order[] = ordersRes.rows.map((o) => ({
      id: o.id,
      created_at: o.created_at,
      estado: o.estado,
      total: Number(o.total),
      nombre_cliente: o.nombre_cliente,
      telefono_cliente: o.telefono_cliente,
      notas: o.notas,
      items: itemsByOrder.get(o.id) ?? [],
    }))

    return NextResponse.json({ orders })
  } catch (err: any) {
    log.error("orders", "Error en GET /api/admin/orders", err)
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Sin base de datos" }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { id, estado, notas } = body as {
      id: number
      estado?: OrderStatus
      notas?: string
    }

    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const validStates: OrderStatus[] = ["pendiente", "pagado", "enviado", "cancelado"]
    if (estado && !validStates.includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    const updates: string[] = []
    const params: unknown[] = []

    if (estado) {
      params.push(estado)
      updates.push(`estado = $${params.length}`)
    }
    if (notas !== undefined) {
      params.push(notas)
      updates.push(`notas = $${params.length}`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 })
    }

    params.push(id)
    await query(
      `UPDATE pedidos SET ${updates.join(", ")} WHERE id = $${params.length}`,
      params
    )

    log.info("orders", `Pedido #${id} actualizado${estado ? ` — nuevo estado: ${estado}` : ""}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    log.error("orders", "Error en PATCH /api/admin/orders", err)
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Sin base de datos" }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get("id") ?? "", 10)
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    await query("DELETE FROM pedido_items WHERE pedido_id = $1", [id])
    await query("DELETE FROM pedidos WHERE id = $1", [id])

    log.info("orders", `Pedido #${id} eliminado`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    log.error("orders", "Error en DELETE /api/admin/orders", err)
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
