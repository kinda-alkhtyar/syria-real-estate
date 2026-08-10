export function createApplicationLifecycle() {
  let shuttingDown = false

  return {
    isShuttingDown() {
      return shuttingDown
    },
    markShuttingDown() {
      shuttingDown = true
    },
  }
}

const applicationLifecycle = createApplicationLifecycle()

export default applicationLifecycle
