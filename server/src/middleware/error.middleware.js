export default function errorMiddleware(error, _request, response, _next) {
  const statusCode =
    Number.isInteger(error.statusCode) && error.statusCode >= 400
      ? error.statusCode
      : 500

  const isServerError = statusCode >= 500

  console.error(error)

  response.status(statusCode).json({
    error: {
      code:
        typeof error.code === 'string'
          ? error.code
          : 'INTERNAL_SERVER_ERROR',
      message: isServerError
        ? 'An unexpected error occurred.'
        : error.message,
    },
  })
}
