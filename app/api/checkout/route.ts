import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { log } from "@/lib/logger"

type CheckoutItem = {
  id: number
  nombre?: string
  price?: number
  selectedSize?: string | null
  selectedColor?: string | null
  quantity: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const items: CheckoutItem[] = body.items || []
    const nombre_cliente: string | null = body.nombre_cliente || null
    const telefono_cliente: string | null = body.telefono_cliente || null
    const total: number = body.total || 0

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No hay items" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      log.info("checkout", `Pedido fallback recibido — cliente: ${nombre_cliente ?? "anónimo"}, items: ${items.length}`)
      return NextResponse.json({ ok: true, fallback: true })
    }

    // DB mode
    try {
      await query("BEGIN")

      // 1. Save order
      const orderRes = await query<{ id: number }>(
        `INSERT INTO pedidos (estado, total, nombre_cliente, telefono_cliente)
         VALUES ('pendiente', $1, $2, $3)
         RETURNING id`,
        [total, nombre_cliente, telefono_cliente]
      )
      const orderId = orderRes.rows[0]?.id

      // 2. Save order items
      if (orderId) {
        for (const it of items) {
          await query(
            `INSERT INTO pedido_items
               (pedido_id, producto_id, nombre_producto, talle, color, cantidad, precio_unitario)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              orderId,
              it.id,
              it.nombre || "Producto",
              it.selectedSize || "",
              it.selectedColor || "",
              it.quantity,
              it.price || 0,
            ]
          )
        }
      }

      await query("COMMIT")
      log.info("checkout", `Pedido #${orderId} guardado — cliente: ${nombre_cliente ?? "anónimo"}, total: ${total}`)
      return NextResponse.json({ ok: true, orderId })
    } catch (dbErr) {
      await query("ROLLBACK")
      log.error("checkout", "Error al guardar pedido en DB", dbErr)
      return NextResponse.json({ ok: false, error: String(dbErr) }, { status: 500 })
    }
  } catch (err: unknown) {
    log.error("checkout", "Error inesperado en POST /api/checkout", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
