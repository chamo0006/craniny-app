const ts = () => new Date().toISOString()

export const log = {
  info(route: string, msg: string, data?: unknown) {
    console.log(`[${ts()}] [${route}] ${msg}`, data !== undefined ? data : "")
  },
  warn(route: string, msg: string, data?: unknown) {
    console.warn(`[${ts()}] [${route}] WARN: ${msg}`, data !== undefined ? data : "")
  },
  error(route: string, msg: string, err?: unknown) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error(`[${ts()}] [${route}] ERROR: ${msg} — ${e.message}`)
    if (e.stack) console.error(e.stack)
  },
}
