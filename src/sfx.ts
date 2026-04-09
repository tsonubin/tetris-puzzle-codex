import Conductor from '@meenie/band.js'

type SongNote =
  | string
  | {
      type: 'note' | 'rest'
      rhythm: string
      pitch?: string | string[]
      tie?: boolean
    }

type SongJSON = {
  instruments: Record<
    string,
    {
      name: string
      pack: 'oscillators' | 'noises'
    }
  >
  notes: Record<string, SongNote[]>
  tempo?: number
  timeSignature?: [number, number]
}

type AudioContextLike = {
  currentTime?: number
  close?: () => Promise<void>
  createGain?: () => GainNode
  createOscillator?: () => OscillatorNode
  destination?: AudioDestinationNode
  resume?: () => Promise<void>
  state?: string
}

type SfxStep = {
  durationMs: number
  frequency?: number
  gain?: number
  type?: OscillatorType
}

type SfxAudioContext = AudioContextLike & {
  currentTime: number
  createGain: () => GainNode
  createOscillator: () => OscillatorNode
  destination: AudioDestinationNode
}

type LoopPlayer = {
  play: () => void
  loop?: (enabled: boolean) => void
  stop: (fadeOut?: boolean) => void
}

type BgmHandle = {
  conductor: Conductor
  player: LoopPlayer
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

function createSong(
  instruments: SongJSON['instruments'],
  notes: SongJSON['notes'],
  tempo = 240,
): SongJSON {
  return {
    instruments,
    notes,
    tempo,
    timeSignature: [4, 4],
  }
}

function closeContext(context: AudioContextLike | undefined) {
  if (!context?.close) {
    return
  }

  void context.close().catch(() => {})
}

function resumeContext(context: AudioContextLike | undefined) {
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

function repeatPattern(pattern: string[], repeats: number) {
  return Array.from({ length: repeats }, () => pattern).flat()
}

function buildTetrisBgmSong() {
  const lead = repeatPattern(
    [
      'eighth|A5',
      'eighth|E5',
      'eighth|G5',
      'eighth|A5',
      'eighth|C6',
      'eighth|B5',
      'eighth|A5',
      'eighth|G5',
      'eighth|A5',
      'eighth|C6',
      'eighth|E6',
      'eighth|C6',
      'eighth|B5',
      'eighth|A5',
      'eighth|G5',
      'eighth|E5',
    ],
    1,
  )

  const pad = repeatPattern(
    [
      'half|A3, C4, E4',
      'half|A3, C4, E4',
      'half|F3, A3, C4',
      'half|G3, B3, D4',
    ],
    2,
  )

  const bass = repeatPattern(
    [
      'half|A2',
      'half|E2',
      'half|F2',
      'half|C2',
      'half|G2',
      'half|D2',
      'half|E2',
      'half|B1',
    ],
    2,
  )

  const sparkle = repeatPattern(
    [
      'quarter|rest',
      'quarter|white',
      'quarter|rest',
      'quarter|white',
    ],
    8,
  )

  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
      pad: { name: 'triangle', pack: 'oscillators' },
      bass: { name: 'triangle', pack: 'oscillators' },
      sparkle: { name: 'white', pack: 'noises' },
    },
    {
      lead,
      pad,
      bass,
      sparkle,
    },
    112,
  )
}

export function createSfxController(): SfxController {
  let hasUnlocked = false
  let musicEnabled = true
  let bgmHandle: BgmHandle | null = null
  let bgmToken = 0
  let sfxContext: AudioContextLike | null = null

  const getSfxContext = () => {
    if (sfxContext) {
      return sfxContext
    }

    const AudioContextCtor = getAudioContextConstructor()

    if (!AudioContextCtor) {
      return null
    }

    sfxContext = new AudioContextCtor() as unknown as AudioContextLike
    return sfxContext
  }

  const playCue = (steps: SfxStep[]) => {
    const rawContext = getSfxContext()

    if (
      !rawContext ||
      rawContext.currentTime === undefined ||
      !rawContext.createGain ||
      !rawContext.createOscillator ||
      !rawContext.destination
    ) {
      return
    }

    const context = rawContext as SfxAudioContext
    let cursor = context.currentTime + 0.01

    steps.forEach((step) => {
      const durationSeconds = step.durationMs / 1000

      if (!step.frequency) {
        cursor += durationSeconds
        return
      }

      const gainNode = context.createGain()
      const oscillator = context.createOscillator()
      const attackTime = Math.min(0.012, durationSeconds / 3)
      const releaseStart = Math.max(cursor + attackTime, cursor + durationSeconds - 0.045)
      const peakGain = step.gain ?? 0.025

      oscillator.type = step.type ?? 'square'
      oscillator.frequency.setValueAtTime(step.frequency, cursor)
      gainNode.gain.setValueAtTime(0.0001, cursor)
      gainNode.gain.exponentialRampToValueAtTime(peakGain, cursor + attackTime)
      gainNode.gain.setValueAtTime(peakGain, releaseStart)
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        cursor + durationSeconds,
      )

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(cursor)
      oscillator.stop(cursor + durationSeconds + 0.02)
      cursor += durationSeconds
    })
  }

  const destroyBgmHandle = (handle: BgmHandle) => {
    try {
      handle.player.stop(false)
    } catch {
      // Ignore stale player errors during shutdown.
    }

    try {
      handle.conductor.destroy()
    } catch {
      // Ignore cleanup failures from already-finished audio graphs.
    }

    closeContext(handle.conductor.audioContext as unknown as AudioContextLike)
  }

  const stopBgm = () => {
    bgmToken += 1

    if (!bgmHandle) {
      return
    }

    const handle = bgmHandle
    bgmHandle = null

    destroyBgmHandle(handle)
  }

  const startBgm = () => {
    if (!hasUnlocked || !musicEnabled || bgmHandle || typeof window === 'undefined') {
      return
    }

    const token = ++bgmToken
    const song = buildTetrisBgmSong()
    const conductor = new Conductor()
    conductor.setMasterVolume(0.028)
    conductor.setNoteBufferLength(24)
    const player = conductor.load(song) as LoopPlayer
    player.loop?.(true)

    const handle = {
      conductor,
      player,
    }

    bgmHandle = handle

    void resumeContext(conductor.audioContext as unknown as AudioContextLike).then(() => {
      if (token !== bgmToken || bgmHandle !== handle || !musicEnabled) {
        closeContext(conductor.audioContext as unknown as AudioContextLike)
        if (bgmHandle === handle) {
          bgmHandle = null
        }
        return
      }

      try {
        player.play()
      } catch {
        stopBgm()
      }
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
        void resumeContext(getSfxContext() ?? undefined)
        syncBgm()
      } else if (bgmHandle) {
        void resumeContext(bgmHandle.conductor.audioContext as unknown as AudioContextLike)
      }

      void resumeContext(sfxContext ?? undefined)
    },
    setMusicEnabled(enabled) {
      musicEnabled = enabled
      syncBgm()
    },
    select() {
      playCue(buildSelectCue())
    },
    rotate() {
      playCue(buildRotateCue())
    },
    place(mass = 3) {
      playCue(buildPlaceCue(mass))
    },
    clear(lines = 1) {
      playCue(buildClearCue(lines))
    },
    error() {
      playCue(buildErrorCue())
    },
    gameOver() {
      playCue(buildGameOverCue())
    },
    reset() {
      playCue(buildResetCue())
    },
    dispose() {
      stopBgm()
      closeContext(sfxContext ?? undefined)
      sfxContext = null
    },
  }
}
