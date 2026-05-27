"use client"

import React, { useState } from "react"

type VariantInput = { talle?: string; color?: string; stock?: number; imagen_url?: string | null }
const initialVariants = JSON.stringify([{ talle: "S", color: "Rojo", stock: 10 }], null, 2)

export default function AdminProductForm() {
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [categoria, setCategoria] = useState("")
  const [variantsJson, setVariantsJson] = useState(initialVariants)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const resetForm = () => {
    setNombre("")
    setDescripcion("")
    setPrecio("")
    setCategoria("")
    setVariantsJson(initialVariants)
    setMessageType('success')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setMessageType('success')

    const parsedPrice = Number(precio.toString().replace(',', '.'))
    if (!nombre.trim()) {
      setMessageType('error')
      setMessage('El nombre es obligatorio.')
      setLoading(false)
      return
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setMessageType('error')
      setMessage('El precio debe ser un número válido mayor que 0.')
      setLoading(false)
      return
    }

    let variants: VariantInput[] = []
    try {
      variants = variantsJson.trim() ? JSON.parse(variantsJson) : []
      if (!Array.isArray(variants)) throw new Error('Las variantes deben ser un array JSON')
    } catch (err: any) {
      setMessageType('error')
      setMessage(`Error en variantes: ${err.message}`)
      setLoading(false)
      return
    }

    const payload = { nombre, descripcion, precio: parsedPrice, categoria, variants }

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al crear el producto')

      setMessageType('success')
      setMessage(`Producto creado con id ${data.id}`)
      resetForm()
    } catch (err: any) {
      setMessageType('error')
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 rounded-[28px] border border-slate-100 bg-slate-50 p-6">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Panel admin</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Agrega productos y guarda datos nuevos en la API o en el fallback local si no hay DB.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Remera deportiva"
                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Categoría</span>
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Indumentaria"
                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700">Descripción</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción breve del producto"
              rows={4}
              className="w-full rounded-[28px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Precio</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="232"
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Variantes</span>
              <textarea
                value={variantsJson}
                onChange={(e) => setVariantsJson(e.target.value)}
                rows={5}
                placeholder='[{"talle":"S","color":"Rojo","stock":10}]'
                className="w-full rounded-[28px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-xs text-slate-500">Escribe un array JSON con las variantes.</p>
            </label>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? 'Guardando...' : 'Guardar producto'}
            </button>

            {message && (
              <div className={`rounded-[28px] px-5 py-4 text-sm ${messageType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {message}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
