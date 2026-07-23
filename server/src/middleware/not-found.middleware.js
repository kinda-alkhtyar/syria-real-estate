export default function notFoundMiddleware(_request, response) {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  })
}
