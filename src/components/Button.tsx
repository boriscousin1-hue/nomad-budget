'use client'

import { motion } from 'framer-motion'
import { springy } from '@/lib/motion'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-[var(--color-accent-hover)]',
  secondary: 'bg-black/[0.05] text-ink hover:bg-black/[0.08]',
  ghost: 'text-muted hover:text-ink',
  danger: 'bg-[var(--color-danger)]/[0.08] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/[0.14]',
}

const sizes = {
  sm: 'text-[13px] px-3.5 py-1.5',
  md: 'text-[15px] px-5 py-2.5',
  lg: 'text-[15px] px-6 py-3',
}

type Props = {
  children: ReactNode
  variant?: Variant
  size?: keyof typeof sizes
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
  className?: string
  full?: boolean
}

export default function Button({
  children, variant = 'primary', size = 'md', type = 'button',
  disabled, onClick, className = '', full,
}: Props) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={springy}
      className={`${base} ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </motion.button>
  )
}
