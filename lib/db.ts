import { Pool, QueryResultRow } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

let pool: Pool | undefined

if (connectionString) {
  pool = global.pgPool ?? new Pool({ connectionString })
  if (process.env.NODE_ENV !== "production") {
    global.pgPool = pool
  }
}

export async function query<T extends QueryResultRow = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  if (!pool) {
    throw new Error("Missing DATABASE_URL environment variable")
  }
  const result = await pool.query<T>(sql, params)
  return result
}
