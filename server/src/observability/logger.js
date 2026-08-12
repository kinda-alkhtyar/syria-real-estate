import env from '../config/env.js'

const allowedFieldNames = new Set([
  'category',
  'code',
  'component',
  'durationMs',
  'method',
  'requestId',
  'route',
  'signal',
  // Stack frames only, never the message line: see stackFrames in
  // error.middleware.js for why the first line is stripped.
  'stack',
  'status',
])

function safeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([name, value]) =>
        allowedFieldNames.has(name) &&
        ['number', 'string', 'boolean'].includes(typeof value),
    ),
  )
}

export function createLogger({
  nodeEnv = env.nodeEnv,
  now = () => new Date(),
  sink = console,
} = {}) {
  function write(level, event, fields = {}) {
    try {
      const entry = {
        timestamp: now().toISOString(),
        level,
        event,
        ...safeFields(fields),
      }
      const output =
        nodeEnv === 'production'
          ? JSON.stringify(entry)
          : `${entry.timestamp} ${level.toUpperCase()} ${event} ${JSON.stringify(
              safeFields(fields),
            )}`
      const writer =
        (level === 'error' ? sink.error : level === 'warn' ? sink.warn : null) ??
        sink.log
      if (typeof writer === 'function') writer.call(sink, output)
    } catch {
      // Observability must never interrupt request processing.
    }
  }

  return {
    error(event, fields) {
      write('error', event, fields)
    },
    info(event, fields) {
      write('info', event, fields)
    },
    // For configuration that boots but should not stay this way in production:
    // loud enough to notice, not an error the process failed on.
    warn(event, fields) {
      write('warn', event, fields)
    },
  }
}

const logger = createLogger()

export default logger
