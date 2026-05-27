"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")

    if (!email.trim() || !password.trim() || !phone.trim()) {
      setError("Por favor completa email, teléfono y contraseña.")
      return
    }

    setMessage("Inicio de sesión simulado. En el futuro conectarás la base de datos aquí.")
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-lg shadow-slate-900/5">
          <div className="mb-8 text-center">
            <p className="text-sm font-black tracking-[0.4em] text-slate-500 uppercase">CRANINY LOGIN</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Accede a tu cuenta</h1>
            <p className="mt-3 text-sm text-slate-600">
              Ingresa tus datos para ver y administrar tus pedidos. Esto es una prueba local que podrás conectar con base de datos después.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-slate-700">
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+54 9 11 2345-6789"
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-full bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800"
            >
              Iniciar sesión
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600">
            <p>
              ¿No estás registrado? <Link href="/register" className="font-bold text-slate-900 underline">Crea tu cuenta</Link>
            </p>
            <p className="mt-3">
              ¿Quieres ver los productos sin login? <Link href="/" className="font-bold text-slate-900 underline">Ir al inicio</Link>
            </p>
          </div>
        </div>
      </div>
      </main>
    </>
  )
}
