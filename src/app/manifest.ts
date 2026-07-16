import type { MetadataRoute } from 'next'

// Manifest PWA : rend l'app installable sur l'écran d'accueil (mode plein écran).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nomad Budget',
    short_name: 'Nomad',
    description: 'Suis tes dépenses de voyage en devise locale, sans mauvaise surprise.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: '#0071e3',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
