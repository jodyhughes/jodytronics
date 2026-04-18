function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export class MidiController {
  constructor({ onNoteOn, onNoteOff, onCc } = {}) {
    this._onNoteOn = onNoteOn
    this._onNoteOff = onNoteOff
    this._onCc = onCc
    this._inputs = []
    this._init()
  }

  async _init() {
    if (!navigator.requestMIDIAccess) return

    try {
      const access = await navigator.requestMIDIAccess()
      this._attachInputs(access)
      access.onstatechange = () => this._attachInputs(access)
    } catch (err) {
      console.warn('MIDI access denied:', err)
    }
  }

  _attachInputs(access) {
    this._inputs = []
    for (const input of access.inputs.values()) {
      input.onmidimessage = (e) => this._handleMessage(e)
      this._inputs.push(input)
    }
  }

  _handleMessage(e) {
    const [status, data1, data2] = e.data
    const type = status & 0xf0

    if (type === 0x90 && data2 > 0) {
      this._onNoteOn?.(midiToFreq(data1), data1, data2 / 127)
    } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      this._onNoteOff?.(data1)
    } else if (type === 0xb0) {
      this._onCc?.(data1, data2 / 127)
    }
  }

  destroy() {
    for (const input of this._inputs) {
      input.onmidimessage = null
    }
  }
}
