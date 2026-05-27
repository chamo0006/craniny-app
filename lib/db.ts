import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL

let pool: Pool | undefined

if (connectionString) {
  declare global {
    // eslint-disable-next-line no-var
    var pgPool: Pool | undefined
  }

  pool = global.pgPool ?? new Pool({ connectionString })

  if (process.env.NODE_ENV !== "production") {
    global.pgPool = pool
  }
}

export async function query<T = any>(sql: string, params: any[] = []) {
  if (!pool) {
    throw new Error("Missing DATABASE_URL environment variable")
  }

  const result = await pool.query<T>(sql, params)
  return result
}
