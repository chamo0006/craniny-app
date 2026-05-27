"use client"

import Link from "next/link"

interface LogoProps {
  onClick?: () => void
}

export function Logo({ onClick }: LogoProps) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-3 text-slate-900">
      <svg
        width="72"
        height="72"
        viewBox="0 0 180 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-14 w-14"
      >
        <rect width="180" height="120" rx="24" fill="#F8F8F8" />
        <path d="M22 50H82L68 34H110" stroke="#111" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M54 50H54C57.5 50 60.5 53 60.5 56.5V85.5C60.5 89 57.5 92 54 92H42" stroke="#111" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M72 56C76 52 84 50 90 56C96 62 96 72 90 78C84 84 76 84 72 78" stroke="#111" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-[0.45em] text-slate-500">streetwear</span>
        <span className="text-2xl font-black tracking-[0.38em] text-slate-900">CRANINY</span>
      </div>
    </Link>
  )
}
