export default function notFoundMiddleware(request, response) {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource was not found.',
      // Every other error carries the id; a client correlating a failure must
      // not have to special-case the one shape that omitted it.
      requestId: request.id,
    },
  })
}
