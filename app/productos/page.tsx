export const dynamic = 'force-dynamic'

import { ProductsPageClient } from '@/components/products-page-client'
import { getCategories, getProducts } from '@/lib/products'
import { loadColors } from '@/lib/colors'

export default async function ProductsPage() {
  const [categories, products, colors] = await Promise.all([
    getCategories(),
    getProducts(),
    loadColors(),
  ])

  return (
    <ProductsPageClient
      initialProducts={products}
      categories={categories.map((category) => category.nombre)}
      initialColors={colors}
    />
  )
}
