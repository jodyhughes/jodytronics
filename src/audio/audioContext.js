let ctx = null

// iOS 17+: route Web Audio to the media channel, which the mute switch doesn't affect.
// Must be set before AudioContext is created.
if (typeof navigator !== 'undefined' && navigator.audioSession) {
  navigator.audioSession.type = 'playback'
}

export function getContext() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

let _silentUnlocked = false

// Call synchronously within a user gesture handler.
// 1. Plays a 1-sample silent WAV via HTMLAudioElement to elevate iOS <17 audio
//    session from 'ambient' (silenced by mute switch) to 'playback' (ignores it).
// 2. Resumes the AudioContext to satisfy iOS's gesture requirement.
export function touchUnlock() {
  if (!_silentUnlocked && !navigator.audioSession) {
    _silentUnlocked = true
    const wav = new Uint8Array([
      82,73,70,70, 37,0,0,0, 87,65,86,69,
      102,109,116,32, 16,0,0,0, 1,0, 1,0,
      64,31,0,0, 64,31,0,0, 1,0, 8,0,
      100,97,116,97, 1,0,0,0, 128,
    ])
    const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
    const audio = new Audio(url)
    audio.play().catch(() => {}).finally(() => URL.revokeObjectURL(url))
  }

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
