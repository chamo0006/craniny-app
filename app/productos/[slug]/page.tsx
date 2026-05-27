export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { CategoryPageClient } from '@/components/category-page-client'
import { getCategoryBySlug, getCategories, getProductsByCategorySlug } from '@/lib/products'

export async function generateStaticParams() {
  const categories = await getCategories()
  return categories.map((category) => ({
    slug: category.nombre.toLowerCase().replace(/\s+/g, '-'),
  }))
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const filteredProducts = await getProductsByCategorySlug(slug)
  const categories = await getCategories()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      <main className="pt-20">
        <CategoryPageClient
          category={category.nombre}
          initialProducts={filteredProducts}
          categories={categories.map((item) => item.nombre)}
        />
      </main>
    </div>
  )
}
