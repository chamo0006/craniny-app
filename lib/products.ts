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

export { fallbackCategories, fallbackProducts, fallbackVariants }

const fallbackVariants: Variant[] = []

const fallbackProducts: Array<{ id: number; nombre: string; precio: number; category: string }> = []

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

    const knownNames = new Set(
      [...activeFallback, ...activeAdded].map((c) => c.nombre.toLowerCase())
    )

    // Categories inferred from saved products that aren't already known.
    // Use a stable numeric ID derived from the name so IDs don't shift when products are added/removed.
    const stableId = (name: string): number => {
      let h = 3000
      for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
      return Math.abs(h) + 3000
    }

    const savedCategoryNames = Array.from(
      new Set(saved.map((p) => p.category).filter(Boolean))
    ) as string[]
    const savedCats = savedCategoryNames
      .filter((name) => !knownNames.has(name.toLowerCase()))
      .map((name) => ({ id: stableId(name), nombre: name }))

    // Deduplicate: keep first occurrence by id, then by name (case-insensitive)
    const rawAll = [...activeFallback, ...activeAdded, ...savedCats]
    const seenIds = new Set<number>()
    const seenNames = new Set<string>()
    const all = rawAll.filter((c) => {
      if (seenIds.has(c.id)) return false
      if (seenNames.has(c.nombre.toLowerCase())) return false
      seenIds.add(c.id)
      seenNames.add(c.nombre.toLowerCase())
      return true
    })

    if (overrides.order.length > 0) {
      const orderMap = new Map(overrides.order.map((name, i) => [name, i]))
      all.sort((a, b) => (orderMap.get(a.nombre) ?? 9999) - (orderMap.get(b.nombre) ?? 9999))
    }

    return all
  }

  // Load categories and saved order in parallel
  const [result, settingsRes] = await Promise.all([
    query<Category>("SELECT id, nombre FROM categorias ORDER BY nombre"),
    query<{ data: Record<string, unknown> }>(
      "SELECT data FROM site_settings WHERE id = 1 LIMIT 1"
    ),
  ])

  const dbNames = new Set(result.rows.map((c) => c.nombre.toLowerCase()))
  // Exclude fallback categories that collide by ID with a DB category (Supabase SERIAL vs hardcoded IDs 1-6)
  const dbIds = new Set(result.rows.map((c) => c.id))
  const fallbackOnly = fallbackCategories.filter(
    (c) => !dbNames.has(c.nombre.toLowerCase()) && !dbIds.has(c.id)
  )

  const all = [...result.rows, ...fallbackOnly]

  // Apply saved category order from site_settings
  const categoryOrder = (settingsRes.rows[0]?.data?.categoryOrder as string[] | undefined) ?? []
  if (categoryOrder.length > 0) {
    const orderMap = new Map(categoryOrder.map((name, i) => [name.toLowerCase(), i]))
    all.sort(
      (a, b) =>
        (orderMap.get(a.nombre.toLowerCase()) ?? 9999) -
        (orderMap.get(b.nombre.toLowerCase()) ?? 9999)
    )
  }

  return all
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
  if (result.rows[0]) return result.rows[0]
  return fallbackCategories.find((c) => normalizeSlug(c.nombre) === slug) ?? null
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
      const item = buildProductListItem({ ...p, nombre, category: p.category ?? null }, withOverrides(metaVariants))
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

  const dbProductIds = new Set(productsResult.rows.map((p) => p.id))
  const fallbackItems = fallbackProducts
    .filter((p) => !dbProductIds.has(p.id))
    .map((p) => {
      const rawVariants = fallbackVariants.filter((v) => v.producto_id === p.id)
      return buildProductListItem({ ...p, nombre: p.nombre }, rawVariants)
    })
  const dbItems = productsResult.rows.map((product) => buildProductListItem(product, variants))
  const savedItems = saved.map((p) => {
    const savedVariants = (p.variants || []).map((v, idx) => ({
      id: idx + 1,
      producto_id: p.id,
      talle: v.talle || "",
      color: v.color || "",
      stock: v.stock || 0,
      imagen_url: v.imagen_url || null,
    }))
    return buildProductListItem({ ...p, category: p.category ?? null }, savedVariants)
  })

  return dedupeProductsByImagePerCategory([...fallbackItems, ...dbItems, ...savedItems])
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
        return buildProductListItem({ ...(product as SavedProduct), nombre, category: (product as SavedProduct).category ?? null }, variants)
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

  const dbProductIds = new Set(productsResult.rows.map((p) => p.id))
  const fallbackForCategory = fallbackProducts
    .filter((p) => p.category === category.nombre && !dbProductIds.has(p.id))
    .map((p) => {
      const rawVariants = fallbackVariants.filter((v) => v.producto_id === p.id)
      return buildProductListItem({ ...p, nombre: p.nombre }, rawVariants)
    })
  const dbItems = productsResult.rows.map((product) => buildProductListItem(product, variants))

  return dedupeProductsByImagePerCategory([...fallbackForCategory, ...dbItems])
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
    const fallback = fallbackProducts.find((p) => p.id === id)
    if (!fallback) return null
    const rawVariants = fallbackVariants.filter((v) => v.producto_id === id)
    const colors: string[] = Array.from(new Set(rawVariants.map((v) => v.color).filter((x): x is string => !!x)))
    const sizes: string[] = Array.from(new Set(rawVariants.map((v) => v.talle).filter((x): x is string => !!x)))
    const stock = rawVariants.reduce((t, v) => t + v.stock, 0)
    const image = rawVariants.find((v) => v.imagen_url)?.imagen_url ||
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop"
    return {
      id: fallback.id,
      name: fallback.nombre,
      description: null,
      price: Number(fallback.precio),
      category: fallback.category || "Sin categoría",
      colors,
      sizes,
      image,
      stock,
      variants: rawVariants,
      galleryImages: [],
    }
  }

  const variantsResult = await query<Variant>(
    `SELECT id, producto_id, talle, color, stock, imagen_url FROM variantes_producto WHERE producto_id = $1 ORDER BY id`,
    [id]
  )

  const variants = variantsResult.rows
  const colors = Array.from(new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c))))
  const sizes = Array.from(new Set(variants.map((v) => v.talle).filter((s): s is string => Boolean(s))))
  const stock = variants.reduce((total, v) => total + v.stock, 0)
  const image =
    variants.find((v) => v.imagen_url)?.imagen_url ||
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

  const [productsResult, saved] = await Promise.all([
    query<{ id: number; nombre: string; precio: string | number; category: string | null }>(
      `SELECT p.id, p.nombre, p.precio, c.nombre AS category
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       ORDER BY p.nombre`
    ),
    loadSavedProducts(),
  ])

  const productIds = productsResult.rows.map((p) => p.id)
  const variantsResult =
    productIds.length > 0
      ? await query<Variant>(
          `SELECT id, producto_id, talle, color, stock, imagen_url
           FROM variantes_producto
           WHERE producto_id = ANY($1)
           ORDER BY color, talle`,
          [productIds]
        )
      : { rows: [] as Variant[] }

  const dbProductIds = new Set(productsResult.rows.map((p) => p.id))

  const fallbackItems: ProductWithVariants[] = fallbackProducts
    .filter((p) => !dbProductIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.nombre,
      price: Number(p.precio),
      category: p.category || "Sin categoría",
      variants: fallbackVariants.filter((v) => v.producto_id === p.id),
      imagenes: [],
    }))

  const dbItems = productsResult.rows.map((p) => ({
    id: p.id,
    name: p.nombre,
    price: Number(p.precio),
    category: p.category || "Sin categoría",
    variants: variantsResult.rows.filter((v) => v.producto_id === p.id),
    imagenes: [],
  }))

  // Also include products from saved-products.json not yet in DB
  const savedItems: ProductWithVariants[] = saved
    .filter((p) => !dbProductIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.nombre,
      price: Number(p.precio),
      category: p.category || "Sin categoría",
      variants: (p.variants || []).map((v, idx) => ({
        id: idx + 1,
        producto_id: p.id,
        talle: v.talle || "",
        color: v.color || "",
        stock: v.stock || 0,
        imagen_url: v.imagen_url || null,
      })),
      imagenes: [],
    }))

  return [...fallbackItems, ...dbItems, ...savedItems]
}
