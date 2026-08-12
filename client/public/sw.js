/**
 * Minimal service worker for the installable app shell.
 *
 * Bump `version` whenever the caching rules below change: the name is the only
 * thing that makes a browser build a fresh cache, and `activate` deletes every
 * cache that does not carry the current name.
 */
const version = 'v1'
const shellCache = `dar-syria-shell-${version}`
const assetCache = `dar-syria-assets-${version}`

// Kept deliberately short. Everything else is cached as it is requested, so a
// failure to fetch one optional file can never fail the install step.
const shellUrls = ['/', '/manifest.webmanifest', '/favicon.svg']

// Vite emits these with a content hash in the filename, so a given URL always
// answers with the same bytes and may be served from the cache without a
// revalidation.
const immutableAssetPath = '/assets/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(shellCache)
      .then((cache) => cache.addAll(shellUrls))
      // A shell that cannot be precached still leaves a working online app.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== shellCache && key !== assetCache)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(assetCache)
    cache.put(request, response.clone())
  }
  return response
}

/**
 * Network first, so a returning visitor always gets the current build and the
 * cache only answers when the network does not. The fallback is the precached
 * shell rather than the requested path: this is a SPA, so any route renders
 * from the same document.
 */
async function networkFirst(request, { fallbackToShell = false } = {}) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(shellCache)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallbackToShell) {
      const shell = await caches.match('/')
      if (shell) return shell
    }
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // A write must always reach the network, and a cross-origin response — the
  // API and Supabase Storage both live on another origin — is never cached
  // here, so an authenticated answer can never be replayed to another visitor.
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Defensive: covers a deployment that puts the API behind the same origin.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, { fallbackToShell: true }))
    return
  }

  if (url.pathname.startsWith(immutableAssetPath)) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(networkFirst(request))
})
