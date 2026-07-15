'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

type Props = {
  value: number
  decimals?: number
  className?: string
}

// Compteur animé : la valeur défile en douceur vers sa cible (effet « premium »
// sur les totaux monétaires). Recalcule à chaque changement de `value`.
export default function AnimatedNumber({ value, decimals = 2, className }: Props) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    prev.current = value
    return () => controls.stop()
  }, [value])

  return (
    <span className={className}>
      {display.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}
