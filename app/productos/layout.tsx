import type { ReactNode } from 'react'

export const metadata = {
  title: 'CRANINY | Productos',
  description: 'Explorá todas las categorías de productos de CRANINY',
}

export default function ProductosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
