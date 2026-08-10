import { randomUUID } from 'node:crypto'

const acceptedRequestId = /^[A-Za-z0-9_-]{8,64}$/

export function createRequestIdMiddleware({ createId = randomUUID } = {}) {
  return function requestIdMiddleware(request, response, next) {
    const supplied = request.get('X-Request-ID')
    const requestId =
      typeof supplied === 'string' && acceptedRequestId.test(supplied)
        ? supplied
        : createId()

    request.id = requestId
    response.set('X-Request-ID', requestId)
    next()
  }
}

const requestIdMiddleware = createRequestIdMiddleware()

export default requestIdMiddleware
