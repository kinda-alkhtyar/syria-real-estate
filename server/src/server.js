import app from './app.js'
import env from './config/env.js'

const httpServer = app.listen(env.port, () => {
  console.log(`API server is listening on port ${env.port}`)
})

function shutdown(signal) {
  console.log(`${signal} received. Closing the HTTP server.`)

  httpServer.close((error) => {
    if (error) {
      console.error('The HTTP server could not close cleanly.', error)
      process.exit(1)
    }

    console.log('HTTP server closed.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
