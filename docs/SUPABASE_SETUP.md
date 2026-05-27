# Configuración de Supabase para Craniny

## 1. Connection string

1. Abrí tu proyecto en [Supabase](https://supabase.com).
2. Andá a **Settings → Database**.
3. Copiá la **Connection string** (modo URI, Postgres).
4. Pegala en `.env.local` (sin comillas):

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

5. Reiniciá el servidor: `npm run dev`.

## 2. Tablas requeridas

El código espera estas tablas:

### `categorias`

- `id` (serial / integer, PK)
- `nombre` (text)

### `productos`

- `id` (serial / integer, PK)
- `nombre` (text)
- `descripcion` (text, nullable)
- `precio` (numeric)
- `categoria_id` (integer, FK a `categorias.id`)

### `variantes_producto`

- `id` (serial / integer, PK)
- `producto_id` (integer, FK a `productos.id`)
- `talle` (text)
- `color` (text)
- `stock` (integer)
- `imagen_url` (text, nullable)

## 3. SQL de ejemplo

```sql
create table if not exists categorias (
  id serial primary key,
  nombre text not null
);

create table if not exists productos (
  id serial primary key,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  categoria_id integer references categorias(id)
);

create table if not exists variantes_producto (
  id serial primary key,
  producto_id integer not null references productos(id) on delete cascade,
  talle text not null default '',
  color text not null default '',
  stock integer not null default 0,
  imagen_url text
);
```

## 4. Sin DATABASE_URL

Si no configurás la base, la tienda usa datos de prueba en `lib/products.ts` y guarda los cambios de stock en `data/stock-overrides.json` al finalizar un pedido por WhatsApp.

## 5. Probar stock

1. Abrí un producto, por ejemplo: `http://localhost:3000/productos/buzos/4` (Buzo Oliva).
2. Elegí talle y color, agregá al carrito y finalizá por WhatsApp.
3. Recargá la página: el stock de esa variante debe haber bajado.
