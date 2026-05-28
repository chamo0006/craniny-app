# Configuración de Supabase para Craniny

## 1. Obtener el Connection String

1. Abrí tu proyecto en [supabase.com](https://supabase.com)
2. Andá a **Settings → Database → Connection string**
3. Seleccioná **Transaction pooler** (recomendado para Vercel serverless)
4. Copiá la URI — tiene este formato:
   ```
   postgresql://postgres.vchqtavungwjhmdpdiuw:[TU-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```

## 2. Agregar DATABASE_URL en Vercel

1. Abrí tu proyecto en [vercel.com](https://vercel.com)
2. **Settings → Environment Variables**
3. Agregá:
   - **Name**: `DATABASE_URL`
   - **Value**: la connection string del paso 1
4. Hacé un nuevo deploy

## 3. Crear las tablas en Supabase

Andá a **SQL Editor** en Supabase y ejecutá:

```sql
-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id   SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  precio       NUMERIC NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id)
);

-- Variantes (talles / colores / stock)
CREATE TABLE IF NOT EXISTS variantes_producto (
  id          SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talle       TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '',
  stock       INTEGER NOT NULL DEFAULT 0,
  imagen_url  TEXT
);

-- Configuración del sitio (descuentos, envío gratis, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  id   INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{"defaultDiscountType":"transferencia","defaultDiscountPercent":20,"freeShippingThreshold":180000,"products":{}}'::jsonb,
  CONSTRAINT site_settings_single_row CHECK (id = 1)
);
INSERT INTO site_settings (id, data)
VALUES (1, '{"defaultDiscountType":"transferencia","defaultDiscountPercent":20,"freeShippingThreshold":180000,"products":{}}')
ON CONFLICT DO NOTHING;

-- Meta de productos (imágenes, nombres custom)
CREATE TABLE IF NOT EXISTS product_meta (
  product_id INTEGER PRIMARY KEY,
  nombre     TEXT,
  imagen_url TEXT,
  imagenes   TEXT[] DEFAULT '{}'
);

-- Pedidos (órdenes de clientes)
CREATE TABLE IF NOT EXISTS pedidos (
  id                SERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado            TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','pagado','enviado','cancelado')),
  total             NUMERIC NOT NULL DEFAULT 0,
  nombre_cliente    TEXT,
  telefono_cliente  TEXT,
  notas             TEXT
);

-- Items de pedidos
CREATE TABLE IF NOT EXISTS pedido_items (
  id               SERIAL PRIMARY KEY,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id      INTEGER,
  nombre_producto  TEXT NOT NULL,
  talle            TEXT,
  color            TEXT,
  cantidad         INTEGER NOT NULL DEFAULT 1,
  precio_unitario  NUMERIC NOT NULL DEFAULT 0
);

-- Índice para búsqueda rápida por pedido
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
```

## 4. Supabase Storage (imágenes)

El bucket `products` debe existir y ser público:

1. Andá a **Storage** en Supabase
2. Creá un bucket llamado `products`
3. Habilitá **Public bucket** en la configuración del bucket

## 5. Variables de entorno completas en Vercel

| Variable | Dónde conseguirla |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Transaction pooler |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
