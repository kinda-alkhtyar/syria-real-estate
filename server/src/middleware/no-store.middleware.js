/**
 * Marks a response as never storable.
 *
 * Applied to every endpoint whose body depends on the caller's session. Without
 * an explicit directive a shared cache or CDN may store a 200 response
 * heuristically, which on these routes would mean serving one account's
 * listings, profile, or metrics to the next caller. `Vary: Cookie` is appended
 * — never assigned — so the `Vary: Origin` that CORS sets survives, and caches
 * that ignore `no-store` still key on the session cookie.
 */
export default function noStoreMiddleware(_request, response, next) {
  response.set('Cache-Control', 'no-store')
  response.vary('Cookie')
  next()
}

/**
 * The same guarantee for write endpoints.
 *
 * A shared cache will not store a POST, PATCH or DELETE response on its own, so
 * this is defence in depth rather than a fix for observed behaviour: it removes
 * the reliance on that default from an intermediary we do not control. Reads are
 * skipped deliberately — the public listing GETs are meant to be cached, and
 * their headers belong to the read cache.
 */
export function noStoreWriteMiddleware(request, response, next) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    next()
    return
  }

  noStoreMiddleware(request, response, next)
}
