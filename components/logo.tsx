"use client"

import Link from "next/link"
import Image from "next/image"

interface LogoProps {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function Logo({ onClick }: LogoProps) {
  return (
    <Link href="/" onClick={onClick} scroll={false} className="flex items-center gap-3">
      <Image
        src="/craniny-logo.png"
        alt="CRANINY"
        width={180}
        height={80}
        priority
        className="h-14 w-auto"
      />
    </Link>
  )
}
