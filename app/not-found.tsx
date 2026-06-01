import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-black tracking-[0.5em] text-white/40 uppercase mb-6">
        CRANINY — ERROR
      </p>

      <h1 className="text-[120px] sm:text-[180px] font-black leading-none tracking-tighter text-white/10 select-none">
        404
      </h1>

      <h2 className="mt-4 text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
        Página no encontrada
      </h2>

      <p className="mt-3 max-w-sm text-sm text-white/50 leading-relaxed">
        El link que seguiste no existe o fue movido. Volvé al inicio y encontrá lo que buscás.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition hover:bg-slate-100"
        >
          Ir al inicio
        </Link>
        <Link
          href="/productos"
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-xs font-black uppercase tracking-widest text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Ver productos
        </Link>
      </div>
    </div>
  )
}
