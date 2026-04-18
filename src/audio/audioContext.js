let ctx = null

export function getContext() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

export async function resumeContext() {
  const context = getContext()
  if (context.state === 'suspended') {
    await context.resume()
  }
  return context
}
