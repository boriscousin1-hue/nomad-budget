'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { lookupCountryInfo, TAP_WATER_LABEL } from '@/lib/countryInfo'
import { easeApple } from '@/lib/motion'

// Infos pratiques du pays de l'étape en cours (prises, eau, pourboires, urgences).
// Discret : ne s'affiche que si le pays est répertorié. Repliable.
export default function CountryInfo({ country }: { country: string }) {
  const [open, setOpen] = useState(false)
  const info = lookupCountryInfo(country)
  if (!info) return null

  const water = TAP_WATER_LABEL[info.tapWater]
  const waterColor = info.tapWater === 'safe' ? '#34c759' : info.tapWater === 'caution' ? '#ff9f0a' : '#ff453a'

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full card px-5 py-3.5 flex items-center justify-between hover:shadow-[var(--shadow-lift)] transition-shadow"
      >
        <span className="text-[15px] font-medium flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{info.flag}</span>
          <span className="truncate">Infos pratiques — {country}</span>
        </span>
        <span className={`text-faint transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: easeApple }} className="overflow-hidden"
          >
            <div className="card p-5 mt-2 flex flex-col gap-3.5">
              <Row emoji="🔌" title="Prises électriques" value={`Type ${info.plugs}`} sub={info.voltage} />
              <Row emoji={water.emoji} title={water.label} value="" valueColor={waterColor} />
              <Row emoji="💶" title="Pourboire" value={info.tipping} multiline />
              <Row emoji="📶" title="Data mobile" value={info.data} multiline />
              <Row emoji="🚨" title="Urgences" value={info.emergency} multiline />
              <p className="text-[12px] text-faint mt-0.5">Infos indicatives — vérifie avant un besoin critique. eSIM (Airalo, Holafly…) dispo dans ce pays.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ emoji, title, value, sub, valueColor, multiline }: {
  emoji: string; title: string; value: string; sub?: string; valueColor?: string; multiline?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[18px] leading-6 shrink-0 w-6 text-center">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-muted">{title}</div>
        {value && (
          <div className={`text-[15px] ${multiline ? '' : 'font-medium'}`} style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </div>
        )}
        {sub && <div className="text-[13px] text-faint">{sub}</div>}
      </div>
    </div>
  )
}
