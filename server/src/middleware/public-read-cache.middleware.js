import operationalMetrics from '../observability/metrics.js'

const defaultMaximumEntries = 500
const defaultTtlMs = 5_000

/**
 * Query values the schema would supply anyway, so a URL that states them
 * explicitly is the same request as one that omits them. Must mirror the
 * defaults in propertyQuerySchema; a stale entry here only costs a duplicate
 * cache key, never a wrong response.
 */
const schemaDefaultParams = Object.freeze({
  page: '1',
  pageSize: '20',
  sort: 'newest',
})

function cacheControlValue(ttlMs) {
  return `public, max-age=${Math.floor(ttlMs / 1_000)}`
}

/**
 * One key per distinct response rather than per distinct URL: parameters are
 * sorted and default-valued ones dropped, so `?pageSize=20&page=1`, `?page=1`
 * and a bare path all resolve to the same entry. Without this a caller could
 * evict the whole cache just by permuting parameters that change nothing.
 */
export function canonicalCacheKey(url, defaultParams = schemaDefaultParams) {
  const [path, query = ''] = String(url).split('?')
  if (!query) return path

  const parameters = [...new URLSearchParams(query)]
    .filter(([name, value]) => defaultParams[name] !== value)
    .sort(
      ([nameA, valueA], [nameB, valueB]) =>
        nameA.localeCompare(nameB) || valueA.localeCompare(valueB),
    )

  const canonical = new URLSearchParams(parameters).toString()
  return canonical ? `${path}?${canonical}` : path
}

export function createPublicReadCache({
  defaultParams = schemaDefaultParams,
  maximumEntries = defaultMaximumEntries,
  metrics = operationalMetrics,
  now = Date.now,
  ttlMs = defaultTtlMs,
} = {}) {
  const entries = new Map()
  const pending = new Map()
  const cacheControl = cacheControlValue(ttlMs)

  // A Map iterates in insertion order, so re-inserting a key makes it the
  // newest and the eviction below always drops the least recently used one.
  function touch(key, entry) {
    entries.delete(key)
    entries.set(key, entry)
  }

  function remember(key, entry) {
    entries.delete(key)
    while (entries.size >= maximumEntries) {
      entries.delete(entries.keys().next().value)
    }
    entries.set(key, entry)
  }

  function send(response, entry) {
    response.set('Cache-Control', cacheControl)
    response.status(entry.statusCode).json(entry.body)
  }

  return async function publicReadCache(request, response, next) {
    if (request.method !== 'GET') {
      response.once('finish', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          entries.clear()
        }
      })
      next()
      return
    }

    const key = canonicalCacheKey(request.originalUrl, defaultParams)
    const currentTime = now()
    const cached = entries.get(key)
    if (cached && cached.expiresAt > currentTime) {
      metrics.recordCacheHit()
      touch(key, cached)
      send(response, cached)
      return
    }
    if (cached) entries.delete(key)

    const inFlight = pending.get(key)
    if (inFlight) {
      metrics.recordCacheHit()
      const entry = await inFlight
      if (entry) {
        send(response, entry)
        return
      }
      next()
      return
    }

    metrics.recordCacheMiss()
    let settle
    const completion = new Promise((resolve) => {
      settle = resolve
    })
    pending.set(key, completion)

    const originalJson = response.json.bind(response)
    let settled = false
    function finish(entry) {
      if (settled) return
      settled = true
      pending.delete(key)
      settle(entry)
    }

    response.once('finish', () => finish(null))
    response.json = (body) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        const entry = {
          body,
          expiresAt: now() + ttlMs,
          statusCode: response.statusCode,
        }
        remember(key, entry)
        response.set('Cache-Control', cacheControl)
        finish(entry)
      } else {
        finish(null)
      }
      return originalJson(body)
    }

    next()
  }
}
