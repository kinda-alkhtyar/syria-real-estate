function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

export function createOperationalMetrics({ now = Date.now } = {}) {
  const startedAt = now()
  const state = {
    authenticationFailures: 0,
    cacheHits: 0,
    cacheMisses: 0,
    databaseQueryFailures: 0,
    errors: 0,
    imageUploadFailures: 0,
    latencyMaximumMs: 0,
    latencyTotalMs: 0,
    requests: 0,
    statusClasses: new Map(),
  }

  return {
    recordAuthenticationFailure() {
      state.authenticationFailures += 1
    },
    recordCacheHit() {
      state.cacheHits += 1
    },
    recordCacheMiss() {
      state.cacheMisses += 1
    },
    recordDatabaseQueryFailure() {
      state.databaseQueryFailures += 1
    },
    recordImageUploadFailure() {
      state.imageUploadFailures += 1
    },
    recordRequest({ durationMs, statusCode }) {
      state.requests += 1
      if (statusCode >= 400) state.errors += 1
      state.latencyTotalMs += durationMs
      state.latencyMaximumMs = Math.max(state.latencyMaximumMs, durationMs)
      increment(state.statusClasses, `${Math.floor(statusCode / 100)}xx`)
    },
    snapshot() {
      return {
        startedAt: new Date(startedAt).toISOString(),
        uptimeSeconds: Math.max(0, Math.floor((now() - startedAt) / 1_000)),
        requests: {
          total: state.requests,
          errors: state.errors,
          averageLatencyMs:
            state.requests === 0
              ? 0
              : Number((state.latencyTotalMs / state.requests).toFixed(2)),
          maximumLatencyMs: Number(state.latencyMaximumMs.toFixed(2)),
          statusClasses: Object.fromEntries(state.statusClasses),
        },
        databaseQueryFailures: state.databaseQueryFailures,
        cache: {
          hits: state.cacheHits,
          misses: state.cacheMisses,
        },
        authenticationFailures: state.authenticationFailures,
        imageUploadFailures: state.imageUploadFailures,
      }
    },
  }
}

const operationalMetrics = createOperationalMetrics()

export default operationalMetrics
