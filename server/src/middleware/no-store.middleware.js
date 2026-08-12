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
