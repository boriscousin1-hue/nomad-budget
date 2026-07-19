'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useOnline } from '@/lib/useOnline'
import { easeApple } from '@/lib/motion'

// Bandeau discret en bas d'écran quand le réseau est coupé. Rassure l'utilisateur :
// l'app reste utilisable, les saisies seront synchronisées au retour du réseau.
export default function OfflineBanner() {
  const online = useOnline()
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: easeApple }}
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#1c1c1e] text-white/95 px-4 py-2.5 text-[13px] font-medium shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff9f0a] opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff9f0a]" />
            </span>
            Hors ligne — tes saisies seront synchronisées au retour du réseau
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
