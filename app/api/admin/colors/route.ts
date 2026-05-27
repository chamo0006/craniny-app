import { NextResponse } from "next/server"
import { loadColors, saveColors } from "@/lib/colors"

export async function GET() {
  try {
    const colors = await loadColors()
    return NextResponse.json({ colors })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { nombre } = await req.json()
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }
    const colors = await loadColors()
    const trimmed = nombre.trim()
    if (colors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return NextResponse.json({ error: "Ya existe ese color." }, { status: 409 })
    }
    colors.push(trimmed)
    await saveColors(colors)
    return NextResponse.json({ ok: true, colors })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const nombre = searchParams.get("nombre")
    if (!nombre) {
      return NextResponse.json({ error: "nombre es obligatorio" }, { status: 400 })
    }
    const colors = await loadColors()
    const decoded = decodeURIComponent(nombre)
    const filtered = colors.filter((c) => c.toLowerCase() !== decoded.toLowerCase())
    if (filtered.length === colors.length) {
      return NextResponse.json({ error: "Color no encontrado." }, { status: 404 })
    }
    await saveColors(filtered)
    return NextResponse.json({ ok: true, colors: filtered })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
