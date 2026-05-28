import AdminProductForm from '@/components/admin-product-form2'
import AdminLogout from '@/components/admin-logout'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="px-4 py-6 sm:py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-start justify-between gap-3 rounded-[24px] sm:rounded-[32px] border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-xl shadow-slate-200/50">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">Admin de productos</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600">Usa este panel para cargar productos nuevos al catálogo.</p>
            </div>
            <AdminLogout />
          </div>
          <AdminProductForm />
        </div>
      </main>
    </div>
  )
}
