// Service worker Nomad Budget — permet d'ouvrir l'app hors-ligne.
// Stratégie :
//  - assets statiques Next (/_next/static, icônes, manifest) : cache-first
//  - navigations (pages HTML) : network-first, repli sur le cache si hors-ligne
//  - tout le reste (Supabase, /api, RSC data) : réseau direct, jamais mis en cache
// Les DONNÉES du voyage ne passent pas par ici : elles sont gérées en IndexedDB
// (instantané + file d'attente) côté application, pour éviter de servir du périmé.

const CACHE = 'nomad-shell-v1'
const SHELL = ['/', '/login', '/manifest.webmanifest', '/icon-192.png', '/apple-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname) ||
    url.pathname === '/manifest.webmanifest'
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // On ne gère que le même domaine. Supabase, taux, etc. → réseau direct.
  if (url.origin !== self.location.origin) return
  // Données dynamiques / RSC → réseau direct (jamais de cache périmé).
  if (url.pathname.startsWith('/api/') || url.searchParams.has('_rsc')) return

  // Assets statiques : cache-first (revalidation en arrière-plan).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
    return
  }

  // Navigations (pages) : network-first, repli sur le cache hors-ligne.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
          return res
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/')) || Response.error()),
    )
  }
})
