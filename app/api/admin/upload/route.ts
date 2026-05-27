import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "product-images"

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  const form = await req.formData()
  const files = form.getAll("files") as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 })
  }

  // Fallback: save locally to public/images/products/
  if (!supabaseUrl || !serviceKey) {
    try {
      const uploadDir = path.join(process.cwd(), "public", "images", "products")
      await fs.mkdir(uploadDir, { recursive: true })

      const urls: string[] = []
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg"
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const dest = path.join(uploadDir, filename)
        const buffer = Buffer.from(await file.arrayBuffer())
        await fs.writeFile(dest, buffer)
        urls.push(`/images/products/${filename}`)
      }

      return NextResponse.json({ urls })
    } catch (err: any) {
      return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
    }
  }

  // Supabase storage upload
  try {
    const urls: string[] = []

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg"
      const name = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/${BUCKET}/${name}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": file.type || "application/octet-stream",
            "x-upsert": "false",
          },
          body: await file.arrayBuffer(),
        }
      )

      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Error subiendo ${file.name}: ${detail}`)
      }

      urls.push(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${name}`)
    }

    return NextResponse.json({ urls })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
