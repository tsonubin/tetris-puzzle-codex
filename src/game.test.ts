import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  calculateBenchmark,
  clampPlacementOrigin,
  getPlacementResult,
  rotateRackPiece,
  type Board,
  type GameState,
  type RackPiece,
} from './game'

function createPiece(
  id: string,
  cells: Array<[number, number]>,
  options?: { name?: string; color?: string },
): RackPiece {
  const mappedCells = cells.map(([x, y]) => ({ x, y }))
  const width = Math.max(...mappedCells.map((cell) => cell.x)) + 1
  const height = Math.max(...mappedCells.map((cell) => cell.y)) + 1

  return {
    id,
    instanceId: `${id}-instance`,
    name: options?.name ?? id,
    color: options?.color ?? '#88ff88',
    cells: mappedCells,
    width,
    height,
    mass: mappedCells.length,
  }
}

function createBoard(filledCells: Array<[number, number, string?]> = []): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from<string | null>({ length: BOARD_SIZE }).fill(null),
  )

  filledCells.forEach(([x, y, color = '#4466ff']) => {
    board[y][x] = color
  })

  return board
}

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: createBoard(),
    rack: [null, null, null, null],
    score: 0,
    placements: 0,
    roundsCompleted: 0,
    totalLinesCleared: 0,
    totalPlacedCells: 0,
    totalClearedCells: 0,
    comboStreak: 0,
    maxCombo: 0,
    peakFillRatio: 0,
    occupancyHistory: [0],
    gameOver: false,
    notice: 'Ready.',
    lastClearPulse: 0,
    lastClearedKeys: [],
    lastClearedRows: [],
    lastClearedColumns: [],
    ...overrides,
  }
}

describe('rotateRackPiece', () => {
  it('rotates cells clockwise and normalizes them back to zero-based bounds', () => {
    const piece = createPiece('lifter', [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ])

    const rotated = rotateRackPiece(piece, 'cw')

    expect(rotated.width).toBe(3)
    expect(rotated.height).toBe(2)
    expect(
      rotated.cells
        .map((cell) => `${cell.x}:${cell.y}`)
        .sort(),
    ).toEqual(['0:0', '0:1', '1:0', '2:0'])
  })
})

describe('clampPlacementOrigin', () => {
  it('keeps the full piece footprint inside the 10x10 board', () => {
    const piece = createPiece('bar', [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ])

    expect(clampPlacementOrigin(piece, -3, -2)).toEqual({ x: 0, y: 0 })
    expect(clampPlacementOrigin(piece, 9, 9)).toEqual({ x: 6, y: 9 })
  })
})

describe('getPlacementResult', () => {
  it('clears completed rows and columns, updates score, and keeps the run alive', () => {
    const finisher = createPiece('finisher', [[0, 0]], {
      name: 'Finisher',
      color: '#ffcc55',
    })
    const spare = createPiece('rail', [
      [0, 0],
      [1, 0],
    ])
    const filledCells: Array<[number, number, string?]> = []

    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (x !== 5) {
        filledCells.push([x, 4])
      }
    }

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      if (y !== 4) {
        filledCells.push([5, y])
      }
    }

    const state = createState({
      board: createBoard(filledCells),
      rack: [finisher, spare, null, null],
    })

    const result = getPlacementResult(state, 0, 5, 4)

    expect(result.score).toBe(405)
    expect(result.totalLinesCleared).toBe(2)
    expect(result.totalClearedCells).toBe(19)
    expect(result.comboStreak).toBe(1)
    expect(result.maxCombo).toBe(1)
    expect(result.placements).toBe(1)
    expect(result.gameOver).toBe(false)
    expect(result.notice).toBe('Cleared 2 lines.')
    expect(result.lastClearedRows).toEqual([4])
    expect(result.lastClearedColumns).toEqual([5])
    expect(result.board[4].every((cell) => cell === null)).toBe(true)
    expect(result.board.every((row) => row[5] === null)).toBe(true)
    expect(result.rack[0]).toBeNull()
    expect(result.rack[1]?.id).toBe('rail')
  })
})

describe('calculateBenchmark', () => {
  it('returns a top-tier benchmark summary for a dominant run', () => {
    const benchmark = calculateBenchmark(
      createState({
        score: 3200,
        placements: 20,
        roundsCompleted: 5,
        totalLinesCleared: 12,
        totalPlacedCells: 60,
        totalClearedCells: 100,
        maxCombo: 4,
        occupancyHistory: [0, 0.1, 0.15, 0.12],
      }),
    )

    expect(benchmark.overall).toBe(99)
    expect(benchmark.rank).toBe('S+')
    expect(benchmark.label).toBe('Matrix Legend')
    expect(benchmark.parts).toHaveLength(4)
  })
})
