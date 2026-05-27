import { NextResponse } from "next/server"
import crypto from "node:crypto"

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
      // Small delay to slow brute-force
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
    return res
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
