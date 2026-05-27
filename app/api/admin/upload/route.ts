import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import fs from "fs/promises"
import path from "path"

const BUCKET = "products"

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const form = await req.formData()
  const files = form.getAll("files") as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 })
  }

  // Fallback: save locally when Supabase isn't configured
  if (!supabaseUrl || !serviceKey) {
    try {
      const uploadDir = path.join(process.cwd(), "public", "images", "products")
      await fs.mkdir(uploadDir, { recursive: true })

      const urls: string[] = []
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg"
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const buffer = Buffer.from(await file.arrayBuffer())
        await fs.writeFile(path.join(uploadDir, filename), buffer)
        urls.push(`/images/products/${filename}`)
      }

      return NextResponse.json({ urls })
    } catch (err: any) {
      return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
    }
  }

  // Supabase Storage upload via SDK
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const urls: string[] = []

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg"
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        })

      if (error) throw new Error(`Error subiendo ${file.name}: ${error.message}`)

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path)

      urls.push(publicUrl)
    }

    return NextResponse.json({ urls })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 500 })
  }
}
