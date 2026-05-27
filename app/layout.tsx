import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { HashScroll } from '@/components/hash-scroll'
import { CartProvider } from '@/context/cart-context'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRANINY | Street Culture Clothing',
  description: 'Premium streetwear for the urban culture. Shop the latest drops in hoodies, boxy fit tees, and cargo pants.',
  keywords: ['streetwear', 'urban fashion', 'hoodies', 'street culture', 'CRANINY'],
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <CartProvider>
          <HashScroll />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </CartProvider>
      </body>
    </html>
  )
}
