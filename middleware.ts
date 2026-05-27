import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE = "craniny_admin"
const SECRET = process.env.ADMIN_SECRET ?? "craniny-secret-2025"
const USERNAME = process.env.ADMIN_USERNAME ?? "motzocra"
const PASSWORD = process.env.ADMIN_PASSWORD ?? "motzoleo"

async function expectedToken(): Promise<string> {
  const data = `${SECRET}:${USERNAME}:${PASSWORD}`
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page and auth API through
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  const expected = await expectedToken()
  if (token !== expected) {
    const res = NextResponse.redirect(new URL("/admin/login", request.url))
    res.cookies.delete(COOKIE)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
