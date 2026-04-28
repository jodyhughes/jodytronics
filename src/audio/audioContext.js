let ctx = null

export function getContext() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

// Call synchronously within a user gesture handler to satisfy iOS's strict
// Web Audio unlock requirement before any async work begins.
export function touchUnlock() {
  const context = getContext()
  if (context.state !== 'running') {
    context.resume().catch(() => {})
  }
}

export async function resumeContext() {
  const context = getContext()
  if (context.state === 'suspended') {
    await context.resume()
  }
  return context
}
