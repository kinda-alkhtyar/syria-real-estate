import operationalMetrics from '../observability/metrics.js'

export function createMetricsController({ metrics = operationalMetrics } = {}) {
  return function getMetrics(_request, response) {
    response.set('Cache-Control', 'no-store')
    response.status(200).json({
      data: metrics.snapshot(),
    })
  }
}

export const getMetrics = createMetricsController()
