export const dynamic = 'force-dynamic'

import { notFound } from "next/navigation"
import { ProductPageClient } from "@/components/product-page-client"
import { getProductById, normalizeCategorySlug } from "@/lib/products"

export default async function ProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const productId = parseInt(id, 10)
  const product = await getProductById(productId)

  if (!product || normalizeCategorySlug(product.category) !== slug) {
    notFound()
  }

  return <ProductPageClient product={product} />
}
