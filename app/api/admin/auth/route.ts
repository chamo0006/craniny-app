import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { log } from "@/lib/logger"

const COOKIE = "craniny_admin"
const SECRET = process.env.ADMIN_SECRET ?? "craniny-secret-2025"
const USERNAME = process.env.ADMIN_USERNAME ?? "motzocra"
const PASSWORD = process.env.ADMIN_PASSWORD ?? "motzoleo"

function makeToken(): string {
  return crypto
    .createHash("sha256")
    .update(`${SECRET}:${USERNAME}:${PASSWORD}`)
    .digest("hex")
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (username !== USERNAME || password !== PASSWORD) {
      log.warn("auth", `Intento de login fallido — usuario: "${username}"`)
      await new Promise((r) => setTimeout(r, 400))
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE, makeToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })
    log.info("auth", `Login exitoso — usuario: "${username}"`)
    return res
  } catch (err: any) {
    log.error("auth", "Error en POST /api/admin/auth", err)
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
