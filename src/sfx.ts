type AudioContextLike = {
  close?: () => Promise<void>
  currentTime?: number
  createGain?: () => GainNode
  createOscillator?: () => OscillatorNode
  destination?: AudioDestinationNode
  resume?: () => Promise<void>
  state?: string
}

type SfxAudioContext = AudioContextLike & {
  currentTime: number
  createGain: () => GainNode
  createOscillator: () => OscillatorNode
  destination: AudioDestinationNode
}

type SfxStep = {
  durationMs: number
  frequency?: number
  gain?: number
  type?: OscillatorType
}

type BgmEvent = {
  gain: number
  length: number
  notes: number[]
  type: OscillatorType
}

type BgmStep = {
  bass?: BgmEvent
  lead?: BgmEvent
  pad?: BgmEvent
  sparkle?: BgmEvent
}

type BgmHandle = {
  context: SfxAudioContext
  nextStepTime: number
  stepIndex: number
  timerId: number | null
}

export type SfxController = {
  unlock: () => void
  setMusicEnabled: (enabled: boolean) => void
  select: () => void
  rotate: () => void
  place: (mass?: number) => void
  clear: (lines?: number) => void
  error: () => void
  gameOver: () => void
  reset: () => void
  dispose: () => void
}

const BGM_TEMPO = 132
const BGM_STEP_DURATION = 60 / BGM_TEMPO / 2
const BGM_LOOKAHEAD_SECONDS = 0.22
const BGM_LOOKAHEAD_MS = 50

const BGM_PATTERN: BgmStep[] = Array.from({ length: 32 }, () => ({}))

BGM_PATTERN[0] = {
  bass: { notes: [110], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [220, 261.63, 329.63], length: 4, gain: 0.014, type: 'triangle' },
  lead: { notes: [659.25], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[1] = {
  lead: { notes: [493.88], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[2] = {
  bass: { notes: [164.81], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [523.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[3] = {
  lead: { notes: [587.33], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[4] = {
  bass: { notes: [87.31], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [174.61, 220, 261.63], length: 4, gain: 0.013, type: 'triangle' },
  lead: { notes: [659.25], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[5] = {
  lead: { notes: [523.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[6] = {
  bass: { notes: [130.81], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [493.88], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[7] = {
  lead: { notes: [440], length: 1, gain: 0.015, type: 'square' },
  sparkle: { notes: [1318.51], length: 1, gain: 0.004, type: 'square' },
}

BGM_PATTERN[8] = {
  bass: { notes: [98], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [196, 246.94, 293.66], length: 4, gain: 0.014, type: 'triangle' },
  lead: { notes: [523.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[9] = {
  lead: { notes: [659.25], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[10] = {
  bass: { notes: [146.83], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [783.99], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[11] = {
  lead: { notes: [659.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[12] = {
  bass: { notes: [82.41], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [164.81, 220, 261.63], length: 4, gain: 0.013, type: 'triangle' },
  lead: { notes: [523.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[13] = {
  lead: { notes: [493.88], length: 1, gain: 0.015, type: 'square' },
}
BGM_PATTERN[14] = {
  bass: { notes: [123.47], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [440], length: 1, gain: 0.015, type: 'square' },
}
BGM_PATTERN[15] = {
  lead: { notes: [493.88], length: 1, gain: 0.015, type: 'square' },
  sparkle: { notes: [1174.66], length: 1, gain: 0.004, type: 'square' },
}

BGM_PATTERN[16] = {
  bass: { notes: [110], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [220, 261.63, 329.63], length: 4, gain: 0.014, type: 'triangle' },
  lead: { notes: [880], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[17] = {
  lead: { notes: [783.99], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[18] = {
  bass: { notes: [164.81], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [659.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[19] = {
  lead: { notes: [523.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[20] = {
  bass: { notes: [87.31], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [174.61, 220, 261.63], length: 4, gain: 0.013, type: 'triangle' },
  lead: { notes: [659.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[21] = {
  lead: { notes: [783.99], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[22] = {
  bass: { notes: [130.81], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [987.77], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[23] = {
  lead: { notes: [880], length: 1, gain: 0.016, type: 'square' },
  sparkle: { notes: [1567.98], length: 1, gain: 0.004, type: 'square' },
}

BGM_PATTERN[24] = {
  bass: { notes: [98], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [196, 246.94, 293.66], length: 4, gain: 0.014, type: 'triangle' },
  lead: { notes: [1046.5], length: 1, gain: 0.017, type: 'square' },
}
BGM_PATTERN[25] = {
  lead: { notes: [987.77], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[26] = {
  bass: { notes: [146.83], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [880], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[27] = {
  lead: { notes: [783.99], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[28] = {
  bass: { notes: [82.41], length: 2, gain: 0.012, type: 'triangle' },
  pad: { notes: [164.81, 220, 261.63], length: 4, gain: 0.013, type: 'triangle' },
  lead: { notes: [659.25], length: 1, gain: 0.016, type: 'square' },
}
BGM_PATTERN[29] = {
  lead: { notes: [523.25], length: 1, gain: 0.015, type: 'square' },
}
BGM_PATTERN[30] = {
  bass: { notes: [123.47], length: 2, gain: 0.01, type: 'triangle' },
  lead: { notes: [493.88], length: 1, gain: 0.015, type: 'square' },
}
BGM_PATTERN[31] = {
  lead: { notes: [523.25], length: 1, gain: 0.015, type: 'square' },
  sparkle: { notes: [1318.51], length: 1, gain: 0.004, type: 'square' },
}

function closeContext(context: AudioContextLike | null | undefined) {
  if (!context?.close) {
    return
  }

  void context.close().catch(() => {})
}

function resumeContext(context: AudioContextLike | null | undefined) {
  if (context?.state !== 'suspended' || !context.resume) {
    return Promise.resolve()
  }

  return context.resume().catch(() => {})
}

function getAudioContextConstructor() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.AudioContext ??
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
}

function createContext(): SfxAudioContext | null {
  const AudioContextCtor = getAudioContextConstructor()

  if (!AudioContextCtor) {
    return null
  }

  return new AudioContextCtor() as unknown as SfxAudioContext
}

function buildSelectCue(): SfxStep[] {
  return [{ frequency: 987.77, durationMs: 90, gain: 0.025, type: 'square' }]
}

function buildRotateCue(): SfxStep[] {
  return [
    { frequency: 659.25, durationMs: 75, gain: 0.024, type: 'square' },
    { frequency: 987.77, durationMs: 95, gain: 0.02, type: 'triangle' },
  ]
}

function buildPlaceCue(mass: number): SfxStep[] {
  const heavy = mass >= 6
  const huge = mass >= 9
  const root = huge ? 130.81 : heavy ? 164.81 : 196
  const accent = huge ? 196 : heavy ? 246.94 : 293.66

  return [
    { durationMs: 35 },
    { frequency: accent, durationMs: 110, gain: 0.024, type: 'square' },
    { frequency: root, durationMs: 130, gain: 0.018, type: 'triangle' },
  ]
}

function buildClearCue(lines: number): SfxStep[] {
  const clamped = Math.max(1, Math.min(lines, 4))
  const melody =
    clamped >= 4
      ? [523.25, 659.25, 783.99, 1046.5]
      : clamped === 3
        ? [493.88, 587.33, 783.99]
        : clamped === 2
          ? [440, 587.33]
          : [392, 523.25]

  return [
    ...melody.map<SfxStep>((frequency, index) => ({
      durationMs: index === melody.length - 1 ? 170 : 85,
      frequency,
      gain: 0.028,
      type: 'square',
    })),
    { frequency: 261.63, durationMs: 140, gain: 0.018, type: 'triangle' },
    { frequency: 329.63, durationMs: 140, gain: 0.015, type: 'triangle' },
  ]
}

function buildErrorCue(): SfxStep[] {
  return [
    { frequency: 110, durationMs: 120, gain: 0.02, type: 'sawtooth' },
    { frequency: 87.31, durationMs: 150, gain: 0.018, type: 'sawtooth' },
  ]
}

function buildGameOverCue(): SfxStep[] {
  return [
    { frequency: 329.63, durationMs: 180, gain: 0.02, type: 'square' },
    { frequency: 261.63, durationMs: 180, gain: 0.018, type: 'square' },
    { frequency: 220, durationMs: 280, gain: 0.016, type: 'triangle' },
    { durationMs: 60 },
    { frequency: 110, durationMs: 260, gain: 0.012, type: 'triangle' },
  ]
}

function buildResetCue(): SfxStep[] {
  return [
    { frequency: 261.63, durationMs: 75, gain: 0.022, type: 'square' },
    { frequency: 329.63, durationMs: 75, gain: 0.022, type: 'square' },
    { frequency: 392, durationMs: 90, gain: 0.022, type: 'square' },
    { frequency: 523.25, durationMs: 150, gain: 0.014, type: 'triangle' },
  ]
}

function scheduleNote(
  context: SfxAudioContext,
  frequency: number,
  startTime: number,
  durationSeconds: number,
  type: OscillatorType,
  gain: number,
) {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const attackTime = Math.min(0.02, durationSeconds / 3)
  const releaseTime = Math.min(0.08, durationSeconds / 2)
  const releaseStart = Math.max(
    startTime + attackTime,
    startTime + durationSeconds - releaseTime,
  )

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(gain, startTime + attackTime)
  gainNode.gain.setValueAtTime(gain, releaseStart)
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + durationSeconds,
  )

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + durationSeconds + 0.04)
}

function scheduleCue(context: SfxAudioContext, steps: SfxStep[]) {
  let cursor = context.currentTime + 0.01

  steps.forEach((step) => {
    const durationSeconds = step.durationMs / 1000

    if (step.frequency) {
      scheduleNote(
        context,
        step.frequency,
        cursor,
        durationSeconds,
        step.type ?? 'square',
        step.gain ?? 0.025,
      )
    }

    cursor += durationSeconds
  })
}

function scheduleBgmEvent(
  context: SfxAudioContext,
  startTime: number,
  event: BgmEvent | undefined,
) {
  if (!event) {
    return
  }

  const durationSeconds = event.length * BGM_STEP_DURATION
  const perNoteGain = event.gain / Math.max(1, Math.sqrt(event.notes.length))

  event.notes.forEach((note) => {
    scheduleNote(
      context,
      note,
      startTime,
      durationSeconds,
      event.type,
      perNoteGain,
    )
  })
}

function scheduleBgm(handle: BgmHandle) {
  while (
    handle.nextStepTime <
    handle.context.currentTime + BGM_LOOKAHEAD_SECONDS
  ) {
    const step = BGM_PATTERN[handle.stepIndex]

    scheduleBgmEvent(handle.context, handle.nextStepTime, step.pad)
    scheduleBgmEvent(handle.context, handle.nextStepTime, step.bass)
    scheduleBgmEvent(handle.context, handle.nextStepTime, step.lead)
    scheduleBgmEvent(handle.context, handle.nextStepTime, step.sparkle)

    handle.nextStepTime += BGM_STEP_DURATION
    handle.stepIndex = (handle.stepIndex + 1) % BGM_PATTERN.length
  }
}

export function createSfxController(): SfxController {
  let hasUnlocked = false
  let musicEnabled = true
  let bgmHandle: BgmHandle | null = null
  let sfxContext: SfxAudioContext | null = null

  const getSfxContext = () => {
    if (sfxContext) {
      return sfxContext
    }

    sfxContext = createContext()
    return sfxContext
  }

  const playSfx = (steps: SfxStep[]) => {
    const context = getSfxContext()

    if (!context) {
      return
    }

    scheduleCue(context, steps)
  }

  const stopBgm = () => {
    if (!bgmHandle) {
      return
    }

    if (bgmHandle.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(bgmHandle.timerId)
    }

    closeContext(bgmHandle.context)
    bgmHandle = null
  }

  const startBgm = () => {
    if (!hasUnlocked || !musicEnabled || bgmHandle || typeof window === 'undefined') {
      return
    }

    const context = createContext()

    if (!context) {
      return
    }

    const handle: BgmHandle = {
      context,
      nextStepTime: context.currentTime + 0.05,
      stepIndex: 0,
      timerId: null,
    }

    bgmHandle = handle

    void resumeContext(context).then(() => {
      if (bgmHandle !== handle || !musicEnabled) {
        closeContext(context)
        if (bgmHandle === handle) {
          bgmHandle = null
        }
        return
      }

      scheduleBgm(handle)
      handle.timerId = window.setInterval(() => {
        if (bgmHandle !== handle) {
          return
        }

        scheduleBgm(handle)
      }, BGM_LOOKAHEAD_MS)
    })
  }

  const syncBgm = () => {
    if (musicEnabled) {
      startBgm()
      return
    }

    stopBgm()
  }

  return {
    unlock() {
      if (!hasUnlocked) {
        hasUnlocked = true
        void resumeContext(getSfxContext())
        syncBgm()
      } else {
        void resumeContext(sfxContext)
        void resumeContext(bgmHandle?.context)
      }
    },
    setMusicEnabled(enabled) {
      musicEnabled = enabled
      syncBgm()
    },
    select() {
      playSfx(buildSelectCue())
    },
    rotate() {
      playSfx(buildRotateCue())
    },
    place(mass = 3) {
      playSfx(buildPlaceCue(mass))
    },
    clear(lines = 1) {
      playSfx(buildClearCue(lines))
    },
    error() {
      playSfx(buildErrorCue())
    },
    gameOver() {
      playSfx(buildGameOverCue())
    },
    reset() {
      playSfx(buildResetCue())
    },
    dispose() {
      stopBgm()
      closeContext(sfxContext)
      sfxContext = null
    },
  }
}
