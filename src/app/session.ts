import {
  calculateBenchmark,
  createInitialGameState,
  findFirstPlayableRackIndex,
  type BestRun,
  type GameState,
  type RackPiece,
} from '../game'

const STORAGE_KEY = 'grid-forge-best-run-v2'
const MUSIC_STORAGE_KEY = 'grid-forge-music-enabled-v1'

export type InitialSession = {
  game: GameState
  selectedRackIndex: number | null
}

export function readBestRun(): BestRun | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)

    if (!value) {
      return null
    }

    return JSON.parse(value) as BestRun
  } catch {
    return null
  }
}

export function saveBestRun(bestRun: BestRun) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bestRun))
}

export function readMusicEnabled() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const value = window.localStorage.getItem(MUSIC_STORAGE_KEY)

    if (value === null) {
      return true
    }

    return value !== 'false'
  } catch {
    return true
  }
}

export function saveMusicEnabled(enabled: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(MUSIC_STORAGE_KEY, String(enabled))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function pickNextSelection(
  rack: Array<RackPiece | null>,
  board: GameState['board'],
) {
  return findFirstPlayableRackIndex(rack, board)
}

export function createBestRun(state: GameState): BestRun {
  const benchmark = calculateBenchmark(state)

  return {
    benchmarkScore: benchmark.overall,
    benchmarkRank: benchmark.rank,
    benchmarkLabel: benchmark.label,
    score: state.score,
    linesCleared: state.totalLinesCleared,
    roundsCompleted: state.roundsCompleted,
    placements: state.placements,
    maxCombo: state.maxCombo,
    playedAt: new Date().toISOString(),
  }
}

export function createInitialSession(): InitialSession {
  const game = createInitialGameState()

  return {
    game,
    selectedRackIndex: pickNextSelection(game.rack, game.board),
  }
}
