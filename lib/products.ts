import { query } from "./db"
import fs from "fs/promises"
import path from "path"
import { getOverrideStock, loadStockOverrides } from "./stock-overrides"
import { loadPriceOverrides } from "./price-overrides"
import { loadCatOverrides } from "./categories-overrides"
import { loadMetaOverrides, type MetaOverrides } from "./product-meta-overrides"
import { loadVariantAdditions } from "./variant-additions"

export interface Category {
  id: number
  nombre: string
}

export interface Variant {
  id: number
  producto_id: number
  talle: string
  color: string
  stock: number
  imagen_url: string | null
}

export interface ProductListItem {
  id: number
  name: string
  price: number
  category: string
  colors: string[]
  sizes: string[]
  image: string
  stock: number
}

const useFallbackData = !process.env.DATABASE_URL

const fallbackCategories: Category[] = [
  { id: 1, nombre: "Buzos" },
  { id: 2, nombre: "Remeras" },
  { id: 3, nombre: "Pantalones" },
  { id: 4, nombre: "Camperas" },
  { id: 5, nombre: "Bermudas" },
  { id: 6, nombre: "Gorras" },
]

export { fallbackCategories }

const fallbackVariants: Variant[] = [
  { id: 2, producto_id: 6, talle: "L", color: "Blanco", stock: 8, imagen_url: "/images/products/Remera-Black.webp" },
  { id: 3, producto_id: 7, talle: "M", color: "Negro", stock: 14, imagen_url: "/images/products/Remera-Ranglan.webp" },
  { id: 4, producto_id: 8, talle: "M", color: "Verde", stock: 9, imagen_url: "/images/products/Musculosa.webp" },
  { id: 5, producto_id: 9, talle: "S", color: "Negro", stock: 7, imagen_url: "/images/products/Crop top.webp" },
  { id: 6, producto_id: 10, talle: "M", color: "Blanco", stock: 11, imagen_url: "/images/products/Remera-personalizada.webp" },
  { id: 7, producto_id: 11, talle: "L", color: "Negro", stock: 5, imagen_url: "/images/products/Remera-Rangla2.webp" },
  { id: 8, producto_id: 3, talle: "Único", color: "Dorado", stock: 20, imagen_url: "/images/products/Gorra.webp" },
  { id: 9, producto_id: 12, talle: "M", color: "Negro", stock: 4, imagen_url: "/images/products/Campera.webp" },
  { id: 10, producto_id: 2, talle: "S", color: "Negro", stock: 5, imagen_url: "/images/products/Bermuda.webp" },
  { id: 11, producto_id: 2, talle: "M", color: "Negro", stock: 8, imagen_url: "/images/products/Bermuda.webp" },
  { id: 12, producto_id: 2, talle: "L", color: "Negro", stock: 6, imagen_url: "/images/products/Bermuda.webp" },
  { id: 13, producto_id: 2, talle: "XL", color: "Negro", stock: 3, imagen_url: "/images/products/Bermuda.webp" },
  { id: 17, producto_id: 4, talle: "S", color: "Negro", stock: 8, imagen_url: "/images/products/buzo-oliva.webp" },
  { id: 18, producto_id: 4, talle: "M", color: "Negro", stock: 10, imagen_url: "/images/products/buzo-oliva.webp" },
  { id: 19, producto_id: 4, talle: "L", color: "Negro", stock: 6, imagen_url: "/images/products/buzo-oliva.webp" },
  { id: 20, producto_id: 4, talle: "XL", color: "Negro", stock: 4, imagen_url: "/images/products/buzo-oliva.webp" },
  { id: 21, producto_id: 4, talle: "M", color: "Verde Oliva", stock: 5, imagen_url: "/images/products/buzo-oliva.webp" },
]

const fallbackProducts = [
  { id: 2, nombre: "Bermuda urbana", precio: 35000, category: "Bermudas" },
  { id: 3, nombre: "Gorra de cuero", precio: 25000, category: "Gorras" },
  { id: 4, nombre: "Buzo Oliva Oversized", precio: 45000, category: "Buzos" },
  { id: 6, nombre: "Boxy Fit Tee 'Street Culture'", precio: 18000, category: "Remeras" },
  { id: 7, nombre: "Graphic Tee Ranglan", precio: 22000, category: "Remeras" },
  { id: 8, nombre: "Musculosa Premium", precio: 16000, category: "Remeras" },
  { id: 9, nombre: "Crop Top Urban", precio: 14000, category: "Remeras" },
  { id: 10, nombre: "Remera Personalizada", precio: 20000, category: "Remeras" },
  { id: 11, nombre: "Remera Rangla 2", precio: 19000, category: "Remeras" },
  { id: 12, nombre: "Technical Windbreaker", precio: 65000, category: "Camperas" },
]

const SAVED_FILE = path.join(process.cwd(), "data", "saved-products.json")

type SavedProduct = {
  id: number
  nombre: string
  descripcion?: string | null
  precio: number
  category?: string | null
  variants?: Array<{ talle?: string; color?: string; stock?: number; imagen_url?: string | null }>
}

async function loadSavedProducts(): Promise<SavedProduct[]> {
  try {
    const raw = await fs.readFile(SAVED_FILE, "utf8")
    const arr = JSON.parse(raw || "[]")
    return arr as SavedProduct[]
  } catch {
    return []
  }
}

export interface ProductDetail extends ProductListItem {
  description: string | null
  stock: number
  variants: Variant[]
  galleryImages: string[]
}

const normalizeSlug = (value: string) => value.toLowerCase().replace(/\s+/g, "-")

export function getFallbackBaseStock(productId: number, talle: string, color: string): number {
  const exact = fallbackVariants.find(
    (v) => v.producto_id === productId && v.talle === talle && v.color === color
  )
  if (exact) return exact.stock
  const bySize = fallbackVariants.find((v) => v.producto_id === productId && v.talle === talle)
  return bySize?.stock ?? 0
}

async function applyPriceOverride(id: number, basePrice: number): Promise<number> {
  if (!useFallbackData) return basePrice
  const overrides = await loadPriceOverrides()
  return overrides[id] ?? basePrice
}

async function applyStockOverridesToVariants(variants: Variant[]): Promise<Variant[]> {
  if (!useFallbackData || variants.length === 0) return variants
  const overrides = await loadStockOverrides()
  return variants.map((v) => ({
    ...v,
    stock: getOverrideStock(overrides, v.producto_id, v.talle, v.color, v.stock),
  }))
}

function applyProductMeta(
  id: number,
  nombre: string,
  variants: Variant[],
  overrides: MetaOverrides
): { nombre: string; variants: Variant[] } {
  const meta = overrides[String(id)]
  if (!meta) return { nombre, variants }
  const newNombre = meta.nombre ?? nombre
  if (meta.imagenes && meta.imagenes.length > 0) {
    const imgs = meta.imagenes
    const colors = [...new Set(variants.map((v) => v.color))]
    const colorMap = new Map(colors.map((c, i) => [c, imgs[i % imgs.length]]))
    return {
      nombre: newNombre,
      variants: variants.map((v) => ({ ...v, imagen_url: colorMap.get(v.color) ?? imgs[0] })),
    }
  }
  return {
    nombre: newNombre,
    variants: meta.imagen_url
      ? variants.map((v) => ({ ...v, imagen_url: meta.imagen_url as string }))
      : variants,
  }
}

function dedupeProductsByImagePerCategory(products: ProductListItem[]): ProductListItem[] {
  const seenImagesByCategory = new Map<string, Set<string>>()

  return products.filter((product) => {
    const seen = seenImagesByCategory.get(product.category) ?? new Set<string>()
    if (seen.has(product.image)) {
      return false
    }
    seen.add(product.image)
    seenImagesByCategory.set(product.category, seen)
    return true
  })
}

function buildProductListItem(
  product: { id: number; nombre: string; precio: string | number; category: string | null },
  variants: Variant[]
): ProductListItem {
  const productVariants = variants.filter((variant) => variant.producto_id === product.id)
  const colors = Array.from(new Set(productVariants.map((variant) => variant.color).filter(Boolean)))
  const sizes = Array.from(new Set(productVariants.map((variant) => variant.talle).filter(Boolean)))
  const image =
    productVariants.find((variant) => variant.imagen_url)?.imagen_url ||
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop"
  const stock = productVariants.reduce((total, v) => total + (v.stock || 0), 0)

  return {
    id: product.id,
    name: product.nombre,
    price: Number(product.precio),
    category: product.category || "Sin categoría",
    colors,
    sizes,
    image,
    stock,
  }
}

export async function getCategories(): Promise<Category[]> {
  if (useFallbackData) {
    const [saved, overrides] = await Promise.all([loadSavedProducts(), loadCatOverrides()])

    // Hardcoded categories minus deleted ones
    const activeFallback = fallbackCategories.filter((c) => !overrides.deleted.includes(c.id))

    // Custom categories added via admin (minus deleted ones)
    const activeAdded = overrides.added.filter((c) => !overrides.deleted.includes(c.id))

    const knownNames = new Set([
      ...activeFallback.map((c) => c.nombre),
      ...activeAdded.map((c) => c.nombre),
    ])

    // Categories inferred from saved products that aren't already known
    const savedCategoryNames = Array.from(
      new Set(saved.map((p) => p.category).filter(Boolean))
    ) as string[]
    const savedCats = savedCategoryNames
      .filter((name) => !knownNames.has(name))
      .map((name, idx) => ({ id: 2000 + idx, nombre: name }))

    const all = [...activeFallback, ...activeAdded, ...savedCats]

    if (overrides.order.length > 0) {
      const orderMap = new Map(overrides.order.map((name, i) => [name, i]))
      all.sort((a, b) => (orderMap.get(a.nombre) ?? 9999) - (orderMap.get(b.nombre) ?? 9999))
    }

    return all
  }

  const result = await query<Category>("SELECT id, nombre FROM categorias ORDER BY nombre")
  return result.rows
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (useFallbackData) {
    const all = await getCategories()
    return all.find((c) => normalizeSlug(c.nombre) === slug) ?? null
  }

  const result = await query<Category>(
    `SELECT id, nombre FROM categorias WHERE LOWER(REGEXP_REPLACE(nombre, '\\s+', '-', 'g')) = $1 LIMIT 1`,
    [slug]
  )
  return result.rows[0] ?? null
}

export async function getProducts(): Promise<ProductListItem[]> {
  const saved = await loadSavedProducts()

  if (useFallbackData) {
    const [priceOverrides, metaOverrides, stockOverrides] = await Promise.all([
      loadPriceOverrides(),
      loadMetaOverrides(),
      loadStockOverrides(),
    ])
    const withOverrides = (vs: Variant[]) =>
      vs.map((v) => ({
        ...v,
        stock: getOverrideStock(stockOverrides, v.producto_id, v.talle, v.color, v.stock),
      }))
    const savedItems = saved.map((p) => {
      const rawVariants = (p.variants || []).map((v, idx) => ({
        id: idx + 1,
        producto_id: p.id,
        talle: v.talle || "",
        color: v.color || "",
        stock: v.stock || 0,
        imagen_url: v.imagen_url || null,
      }))
      const { nombre, variants: metaVariants } = applyProductMeta(p.id, p.nombre, rawVariants, metaOverrides)
      const item = buildProductListItem({ ...p, nombre }, withOverrides(metaVariants))
      return { ...item, price: priceOverrides[p.id] ?? item.price }
    })
    const items = [
      ...fallbackProducts.map((product) => {
        const rawVariants = fallbackVariants.filter((v) => v.producto_id === product.id)
        const { nombre, variants } = applyProductMeta(product.id, product.nombre, withOverrides(rawVariants), metaOverrides)
        const item = buildProductListItem({ ...product, nombre }, variants)
        return { ...item, price: priceOverrides[product.id] ?? item.price }
      }),
      ...savedItems,
    ]
    return dedupeProductsByImagePerCategory(items)
  }

  const productsResult = await query<{
    id: number
    nombre: string
    precio: string | number
    category: string | null
  }>(
    `SELECT p.id, p.nombre, p.precio, c.nombre AS category
     FROM productos p
     LEFT JOIN categorias c ON p.categoria_id = c.id
     ORDER BY p.id`
  )

  const productIds = productsResult.rows.map((product) => product.id)
  const variants =
    productIds.length > 0
      ? (
          await query<Variant>(
            `SELECT id, producto_id, talle, color, stock, imagen_url FROM variantes_producto WHERE producto_id = ANY($1) ORDER BY id`,
            [productIds]
          )
        ).rows
      : []

  const dbItems = productsResult.rows.map((product) => buildProductListItem(product, variants))
  const savedItems = saved.map((p) => {
    const variants = (p.variants || []).map((v, idx) => ({
      id: idx + 1,
      producto_id: p.id,
      talle: v.talle || "",
      color: v.color || "",
      stock: v.stock || 0,
      imagen_url: v.imagen_url || null,
    }))
    return buildProductListItem(p, variants)
  })

  return dedupeProductsByImagePerCategory([...dbItems, ...savedItems])
}

export async function getProductsByCategorySlug(slug: string): Promise<ProductListItem[]> {
  const category = await getCategoryBySlug(slug)
  if (!category) {
    return []
  }

  if (useFallbackData) {
    const [saved, metaOverrides, stockOverrides] = await Promise.all([
      loadSavedProducts(),
      loadMetaOverrides(),
      loadStockOverrides(),
    ])
    const withOverrides = (vs: Variant[]) =>
      vs.map((v) => ({
        ...v,
        stock: getOverrideStock(stockOverrides, v.producto_id, v.talle, v.color, v.stock),
      }))
    const filteredProducts = [
      ...fallbackProducts.filter((product) => product.category === category.nombre),
      ...saved.filter((p) => p.category === category.nombre),
    ]

    return dedupeProductsByImagePerCategory(
      filteredProducts.map((product) => {
        const rawVariants =
          "variants" in product && Array.isArray(product.variants)
            ? product.variants.map((v, idx) => ({
                id: idx + 1,
                producto_id: product.id,
                talle: v.talle || "",
                color: v.color || "",
                stock: v.stock || 0,
                imagen_url: v.imagen_url || null,
              }))
            : fallbackVariants.filter((v) => v.producto_id === product.id)
        const { nombre, variants } = applyProductMeta(product.id, product.nombre, withOverrides(rawVariants), metaOverrides)
        return buildProductListItem({ ...(product as SavedProduct), nombre }, variants)
      })
    )
  }

  const productsResult = await query<{
    id: number
    nombre: string
    precio: string | number
    category: string | null
  }>(
    `SELECT p.id, p.nombre, p.precio, c.nombre AS category
     FROM productos p
     LEFT JOIN categorias c ON p.categoria_id = c.id
     WHERE p.categoria_id = $1
     ORDER BY p.id`,
    [category.id]
  )

  const productIds = productsResult.rows.map((product) => product.id)
  const variants =
    productIds.length > 0
      ? (
          await query<Variant>(
            `SELECT id, producto_id, talle, color, stock, imagen_url FROM variantes_producto WHERE producto_id = ANY($1) ORDER BY id`,
            [productIds]
          )
        ).rows
      : []

  return dedupeProductsByImagePerCategory(
    productsResult.rows.map((product) => buildProductListItem(product, variants))
  )
}

export async function getProductById(id: number): Promise<ProductDetail | null> {
  if (useFallbackData) {
    const [saved, variantAdditions] = await Promise.all([loadSavedProducts(), loadVariantAdditions()])
    const fallbackProduct =
      fallbackProducts.find((product) => product.id === id) || saved.find((p) => p.id === id)
    if (!fallbackProduct) {
      return null
    }

    const addedVariants = variantAdditions
      .filter((a) => a.productId === id)
      .map((a, idx) => ({ id: -3000 - idx, producto_id: id, talle: a.talle, color: a.color, stock: a.stock, imagen_url: a.imagen_url ?? null }))

    const stockAdjusted = await applyStockOverridesToVariants(
      fallbackVariants
        .filter((variant) => variant.producto_id === id)
        .concat(
          (saved.find((p) => p.id === id)?.variants || []).map((v, idx) => ({
            id: idx + 1,
            producto_id: id,
            talle: v.talle || "",
            color: v.color || "",
            stock: v.stock || 0,
            imagen_url: v.imagen_url || null,
          }))
        )
        .concat(addedVariants)
    )
    const metaOverrides = await loadMetaOverrides()
    const { nombre, variants } = applyProductMeta(fallbackProduct.id, fallbackProduct.nombre, stockAdjusted, metaOverrides)

    const colors = Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean)))
    const sizes = Array.from(new Set(variants.map((variant) => variant.talle).filter(Boolean)))
    const stock = variants.reduce((total, variant) => total + variant.stock, 0)
    const image =
      variants.find((variant) => variant.imagen_url)?.imagen_url ||
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop"

    const basePrice = await applyPriceOverride(fallbackProduct.id, Number(fallbackProduct.precio))
    return {
      id: fallbackProduct.id,
      name: nombre,
      description: null,
      price: basePrice,
      category: fallbackProduct.category || "Sin categoría",
      colors,
      sizes,
      image,
      stock,
      variants,
      galleryImages: metaOverrides[String(fallbackProduct.id)]?.imagenes ?? [],
    }
  }

  const productResult = await query<{
    id: number
    nombre: string
    descripcion: string | null
    precio: string | number
    category: string | null
  }>(
    `SELECT p.id, p.nombre, p.descripcion, p.precio, c.nombre AS category
     FROM productos p
     LEFT JOIN categorias c ON p.categoria_id = c.id
     WHERE p.id = $1
     LIMIT 1`,
    [id]
  )

  const productRow = productResult.rows[0]
  if (!productRow) {
    return null
  }

  const variantsResult = await query<Variant>(
    `SELECT id, producto_id, talle, color, stock, imagen_url FROM variantes_producto WHERE producto_id = $1 ORDER BY id`,
    [id]
  )

  const variants = variantsResult.rows
  const colors = Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean)))
  const sizes = Array.from(new Set(variants.map((variant) => variant.talle).filter(Boolean)))
  const stock = variants.reduce((total, variant) => total + variant.stock, 0)
  const image =
    variants.find((variant) => variant.imagen_url)?.imagen_url ||
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop"

  return {
    id: productRow.id,
    name: productRow.nombre,
    description: productRow.descripcion,
    price: Number(productRow.precio),
    category: productRow.category || "Sin categoría",
    colors,
    sizes,
    image,
    stock,
    variants,
    galleryImages: [],
  }
}

export function normalizeCategorySlug(category: string) {
  return normalizeSlug(category)
}

// ─── Admin: products with full variant breakdown ──────────────────────────────

export type ProductWithVariants = {
  id: number
  name: string
  price: number
  category: string
  variants: Variant[]
  imagenes: string[]
}

export async function getProductsWithVariants(): Promise<ProductWithVariants[]> {
  if (useFallbackData) {
    const [saved, priceOverrides, metaOverrides, stockOverrides, variantAdditions] = await Promise.all([
      loadSavedProducts(),
      loadPriceOverrides(),
      loadMetaOverrides(),
      loadStockOverrides(),
      loadVariantAdditions(),
    ])
    const withOverrides = (vs: Variant[]) =>
      vs.map((v) => ({
        ...v,
        stock: getOverrideStock(stockOverrides, v.producto_id, v.talle, v.color, v.stock),
      }))

    const fallbackItems: ProductWithVariants[] = fallbackProducts.map((p) => {
      const added = variantAdditions
        .filter((a) => a.productId === p.id)
        .map((a, idx) => ({ id: -1000 - idx, producto_id: p.id, talle: a.talle, color: a.color, stock: a.stock, imagen_url: a.imagen_url ?? null }))
      const rawVariants = [...fallbackVariants.filter((v) => v.producto_id === p.id), ...added]
      const { nombre, variants } = applyProductMeta(p.id, p.nombre, withOverrides(rawVariants), metaOverrides)
      return {
        id: p.id,
        name: nombre,
        price: priceOverrides[p.id] ?? Number(p.precio),
        category: p.category || "Sin categoría",
        variants,
        imagenes: metaOverrides[String(p.id)]?.imagenes ?? [],
      }
    })

    const savedItems: ProductWithVariants[] = saved.map((p) => {
      const added = variantAdditions
        .filter((a) => a.productId === p.id)
        .map((a, idx) => ({ id: -2000 - idx, producto_id: p.id, talle: a.talle, color: a.color, stock: a.stock, imagen_url: a.imagen_url ?? null }))
      const rawVariants = [
        ...(p.variants || []).map((v, idx) => ({
          id: idx + 1,
          producto_id: p.id,
          talle: v.talle || "",
          color: v.color || "",
          stock: v.stock || 0,
          imagen_url: v.imagen_url || null,
        })),
        ...added,
      ]
      const { nombre, variants: metaVariants } = applyProductMeta(p.id, p.nombre, rawVariants, metaOverrides)
      return {
        id: p.id,
        name: nombre,
        price: priceOverrides[p.id] ?? Number(p.precio),
        category: p.category || "Sin categoría",
        variants: withOverrides(metaVariants),
        imagenes: metaOverrides[String(p.id)]?.imagenes ?? [],
      }
    })

    return [...fallbackItems, ...savedItems]
  }

  const productsResult = await query<{ id: number; nombre: string; precio: string | number; category: string | null }>(
    `SELECT p.id, p.nombre, p.precio, c.nombre AS category
     FROM productos p
     LEFT JOIN categorias c ON p.categoria_id = c.id
     ORDER BY p.nombre`
  )

  if (productsResult.rows.length === 0) return []

  const productIds = productsResult.rows.map((p) => p.id)
  const variantsResult = await query<Variant>(
    `SELECT id, producto_id, talle, color, stock, imagen_url
     FROM variantes_producto
     WHERE producto_id = ANY($1)
     ORDER BY color, talle`,
    [productIds]
  )

  return productsResult.rows.map((p) => ({
    id: p.id,
    name: p.nombre,
    price: Number(p.precio),
    category: p.category || "Sin categoría",
    variants: variantsResult.rows.filter((v) => v.producto_id === p.id),
    imagenes: [],
  }))
}
