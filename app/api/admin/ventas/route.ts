import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { log } from "@/lib/logger"

/** GET — returns all paid orders + totals, filtered by reset date if set */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ total: 0, count: 0, ventas: [], resetAt: null })
  }

  try {
    // Read the reset timestamp from site_settings
    const settingsRes = await query<{ data: Record<string, unknown> }>(
      "SELECT data FROM site_settings WHERE id = 1 LIMIT 1"
    )
    const resetAt = (settingsRes.rows[0]?.data?.ventas_reset_at as string | null) ?? null

    // Query paid orders after the reset date (or all if no reset)
    const ventas = await query<{
      id: number
      created_at: string
      total: string
      nombre_cliente: string | null
      telefono_cliente: string | null
      notas: string | null
    }>(
      resetAt
        ? `SELECT id, created_at, total, nombre_cliente, telefono_cliente, notas
           FROM pedidos
           WHERE estado = 'pagado' AND created_at > $1
           ORDER BY created_at DESC`
        : `SELECT id, created_at, total, nombre_cliente, telefono_cliente, notas
           FROM pedidos
           WHERE estado = 'pagado'
           ORDER BY created_at DESC`,
      resetAt ? [resetAt] : []
    )

    const totalRevenue = ventas.rows.reduce((s, r) => s + Number(r.total), 0)

    return NextResponse.json({
      total: totalRevenue,
      count: ventas.rows.length,
      resetAt,
      ventas: ventas.rows.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        total: Number(r.total),
        nombre_cliente: r.nombre_cliente,
        telefono_cliente: r.telefono_cliente,
      })),
    })
  } catch (err: any) {
    log.error("ventas", "Error en GET /api/admin/ventas", err)
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

/** DELETE — reset sales counter by saving current timestamp to site_settings */
export async function DELETE() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Sin base de datos" }, { status: 400 })
  }

  try {
    const now = new Date().toISOString()

    await query(
      `INSERT INTO site_settings (id, data)
       VALUES (1, jsonb_build_object('ventas_reset_at', $1::text))
       ON CONFLICT (id) DO UPDATE
         SET data = site_settings.data || jsonb_build_object('ventas_reset_at', $1::text)`,
      [now]
    )

    log.info("ventas", `Ventas reseteadas — nueva fecha de corte: ${now}`)
    return NextResponse.json({ ok: true, resetAt: now })
  } catch (err: any) {
    log.error("ventas", "Error en DELETE /api/admin/ventas", err)
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
