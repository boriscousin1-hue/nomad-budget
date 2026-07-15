import type { Variants, Transition } from 'framer-motion'

// Courbe d'accélération façon Apple : douce, jamais brusque.
export const easeApple: Transition['ease'] = [0.22, 1, 0.36, 1]

// Conteneur qui fait apparaître ses enfants en cascade.
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

// Élément : monte légèrement + fondu.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeApple } },
}

// Apparition simple (fondu + léger scale) pour les cartes isolées.
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: easeApple } },
}

// Interaction bouton : ressort au clic.
export const tap = { scale: 0.96 }
export const springy: Transition = { type: 'spring', stiffness: 400, damping: 30 }
