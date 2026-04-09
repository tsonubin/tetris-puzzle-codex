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
  close?: () => Promise<void>
  resume?: () => Promise<void>
  state?: string
}

type CueHandle = {
  conductor: Conductor
  cleanup: () => void
}

type LoopPlayer = {
  play: () => void
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

function buildSelectSong() {
  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
    },
    {
      lead: ['sixteenth|B5'],
    },
    280,
  )
}

function buildRotateSong() {
  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
      accent: { name: 'triangle', pack: 'oscillators' },
    },
    {
      lead: ['sixteenth|E5', 'sixteenth|B5'],
      accent: ['eighth|E4'],
    },
    260,
  )
}

function buildPlaceSong(mass: number) {
  const heavy = mass >= 6
  const huge = mass >= 9
  const root = huge ? 'C3' : heavy ? 'E3' : 'G3'
  const accent = huge ? 'G3' : heavy ? 'B3' : 'D4'

  return createSong(
    {
      pulse: { name: 'square', pack: 'oscillators' },
      bass: { name: 'triangle', pack: 'oscillators' },
    },
    {
      pulse: ['sixteenth|rest', `eighth|${accent}`],
      bass: [`eighth|${root}`],
    },
    220,
  )
}

function buildClearSong(lines: number) {
  const clamped = Math.max(1, Math.min(lines, 4))
  const melody =
    clamped >= 4
      ? ['sixteenth|C5', 'sixteenth|E5', 'sixteenth|G5', 'eighth|C6']
      : clamped === 3
        ? ['sixteenth|B4', 'sixteenth|D5', 'sixteenth|G5']
        : clamped === 2
          ? ['sixteenth|A4', 'sixteenth|D5']
          : ['sixteenth|G4', 'sixteenth|C5']

  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
      bass: { name: 'triangle', pack: 'oscillators' },
    },
    {
      lead: melody,
      bass: ['eighth|C4', 'eighth|E4'],
    },
    250,
  )
}

function buildErrorSong() {
  return createSong(
    {
      buzz: { name: 'sawtooth', pack: 'oscillators' },
    },
    {
      buzz: ['eighth|A2', 'eighth|F2'],
    },
    180,
  )
}

function buildGameOverSong() {
  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
      bass: { name: 'triangle', pack: 'oscillators' },
    },
    {
      lead: ['eighth|E4', 'eighth|C4', 'quarter|A3'],
      bass: ['quarter|A2', 'quarter|rest', 'quarter|E2'],
    },
    150,
  )
}

function buildResetSong() {
  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
      sparkle: { name: 'triangle', pack: 'oscillators' },
    },
    {
      lead: ['sixteenth|C4', 'sixteenth|E4', 'sixteenth|G4'],
      sparkle: ['eighth|C5'],
    },
    260,
  )
}

function repeatPattern(pattern: string[], repeats: number) {
  return Array.from({ length: repeats }, () => pattern).flat()
}

function buildArcadeBgmSong() {
  const leadPhraseA = [
    'eighth|G5',
    'eighth|B5',
    'eighth|D6',
    'eighth|B5',
    'eighth|A5',
    'eighth|G5',
    'eighth|E5',
    'eighth|rest',
  ]
  const leadPhraseB = [
    'eighth|D5',
    'eighth|G5',
    'eighth|A5',
    'eighth|B5',
    'eighth|D6',
    'eighth|B5',
    'eighth|A5',
    'eighth|G5',
  ]
  const leadPhraseC = [
    'eighth|E5',
    'eighth|G5',
    'eighth|B5',
    'eighth|A5',
    'eighth|G5',
    'eighth|D5',
    'eighth|E5',
    'eighth|rest',
  ]
  const leadPhraseD = [
    'eighth|G5',
    'eighth|B5',
    'eighth|D6',
    'eighth|E6',
    'eighth|D6',
    'eighth|B5',
    'eighth|G5',
    'eighth|rest',
  ]

  return createSong(
    {
      lead: { name: 'square', pack: 'oscillators' },
      pad: { name: 'triangle', pack: 'oscillators' },
      bass: { name: 'triangle', pack: 'oscillators' },
      sparkle: { name: 'white', pack: 'noises' },
    },
    {
      lead: [
        ...leadPhraseA,
        ...leadPhraseB,
        ...leadPhraseC,
        ...leadPhraseD,
      ],
      pad: repeatPattern(
        [
          'quarter|G3, B3, D4',
          'quarter|G3, B3, D4',
          'quarter|D3, F#3, A3',
          'quarter|D3, F#3, A3',
        ],
        4,
      ),
      bass: [
        'quarter|G2',
        'quarter|G2',
        'quarter|D2',
        'quarter|D2',
        'quarter|E2',
        'quarter|E2',
        'quarter|C2',
        'quarter|C2',
        'quarter|G2',
        'quarter|G2',
        'quarter|D2',
        'quarter|D2',
        'quarter|C2',
        'quarter|C2',
        'quarter|D2',
        'quarter|D2',
      ],
      sparkle: repeatPattern(
        [
          'sixteenth|rest',
          'sixteenth|white',
          'sixteenth|rest',
          'sixteenth|white',
        ],
        16,
      ),
    },
    176,
  )
}

function estimateCueDuration(song: SongJSON) {
  const rhythmDuration: Record<string, number> = {
    whole: 1,
    dottedHalf: 0.75,
    half: 0.5,
    dottedQuarter: 0.375,
    tripletHalf: 1 / 3,
    quarter: 0.25,
    dottedEighth: 0.1875,
    tripletQuarter: 1 / 6,
    eighth: 0.125,
    dottedSixteenth: 0.09375,
    tripletEighth: 1 / 12,
    sixteenth: 0.0625,
    tripletSixteenth: 1 / 24,
    thirtySecond: 0.03125,
  }

  const beatSeconds = 60 / (song.tempo ?? 240)
  const longestTrack = Object.values(song.notes).reduce((max, track) => {
    const trackDuration = track.reduce((sum, note) => {
      const rhythm =
        typeof note === 'string'
          ? note.split('|', 1)[0]
          : note.rhythm

      return sum + (rhythmDuration[rhythm] ?? 0.125) * 4
    }, 0)

    return Math.max(max, trackDuration)
  }, 0)

  return Math.max(300, longestTrack * beatSeconds * 1000 + 120)
}

export function createSfxController(): SfxController {
  let hasUnlocked = false
  let musicEnabled = true
  const activeCues = new Set<CueHandle>()
  let bgmHandle: BgmHandle | null = null
  let bgmToken = 0

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

    closeContext(handle.conductor.audioContext as AudioContextLike)
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
    const conductor = new Conductor()
    conductor.setMasterVolume(0.03)
    conductor.setNoteBufferLength(32)

    const player = conductor.load(buildArcadeBgmSong()) as LoopPlayer

    bgmHandle = {
      conductor,
      player,
    }

    conductor.setOnFinishedCallback(() => {
      if (
        token !== bgmToken ||
        !musicEnabled ||
        !bgmHandle ||
        bgmHandle.conductor !== conductor
      ) {
        return
      }

      bgmHandle = null
      destroyBgmHandle({
        conductor,
        player,
      })
      startBgm()
    })

    void resumeContext(conductor.audioContext as AudioContextLike).then(() => {
      if (
        token !== bgmToken ||
        !bgmHandle ||
        bgmHandle.conductor !== conductor ||
        !musicEnabled
      ) {
        closeContext(conductor.audioContext as AudioContextLike)
        if (bgmHandle?.conductor === conductor) {
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

  const playSong = (song: SongJSON, volume: number) => {
    if (typeof window === 'undefined') {
      return
    }

    const conductor = new Conductor()
    conductor.setMasterVolume(volume)
    conductor.setNoteBufferLength(6)

    let timeoutId: number | null = null
    let cleanedUp = false

    const cleanup = () => {
      if (cleanedUp) {
        return
      }

      cleanedUp = true
      activeCues.delete(handle)

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }

      closeContext(conductor.audioContext as AudioContextLike)
    }

    const handle: CueHandle = {
      conductor,
      cleanup,
    }

    activeCues.add(handle)
    conductor.setOnFinishedCallback(cleanup)

    const player = conductor.load(song)
    const startPlayback = () => {
      try {
        player.play()
      } catch {
        cleanup()
      }
    }

    timeoutId = window.setTimeout(cleanup, estimateCueDuration(song))

    if (hasUnlocked) {
      void resumeContext(conductor.audioContext as AudioContextLike).then(startPlayback)
      return
    }

    startPlayback()
  }

  return {
    unlock() {
      if (!hasUnlocked) {
        hasUnlocked = true
        syncBgm()
      } else if (bgmHandle) {
        void resumeContext(bgmHandle.conductor.audioContext as AudioContextLike)
      }

      activeCues.forEach(({ conductor }) => {
        void resumeContext(conductor.audioContext as AudioContextLike)
      })
    },
    setMusicEnabled(enabled) {
      musicEnabled = enabled
      syncBgm()
    },
    select() {
      playSong(buildSelectSong(), 0.14)
    },
    rotate() {
      playSong(buildRotateSong(), 0.16)
    },
    place(mass = 3) {
      playSong(buildPlaceSong(mass), 0.18)
    },
    clear(lines = 1) {
      playSong(buildClearSong(lines), 0.2)
    },
    error() {
      playSong(buildErrorSong(), 0.1)
    },
    gameOver() {
      playSong(buildGameOverSong(), 0.12)
    },
    reset() {
      playSong(buildResetSong(), 0.16)
    },
    dispose() {
      stopBgm()

      activeCues.forEach(({ cleanup }) => {
        cleanup()
      })

      activeCues.clear()
    },
  }
}
