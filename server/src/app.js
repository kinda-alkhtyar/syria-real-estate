import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import env from './config/env.js'
import errorMiddleware from './middleware/error.middleware.js'
import notFoundMiddleware from './middleware/not-found.middleware.js'
import healthRouter from './routes/health.routes.js'

const app = express()

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    const error = new Error('The request origin is not allowed.')
    error.code = 'CORS_ORIGIN_DENIED'
    error.statusCode = 403
    callback(error)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}

app.disable('x-powered-by')
app.use(helmet())
app.use(cors(corsOptions))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(compression())
app.use(express.json({ limit: '1mb' }))

app.use('/health', healthRouter)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
