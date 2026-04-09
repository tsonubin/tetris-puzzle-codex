export const BOARD_SIZE = 10
export const RACK_SIZE = 4

export type Coordinate = {
  x: number
  y: number
}

export type RackPiece = {
  id: string
  instanceId: string
  name: string
  color: string
  cells: Coordinate[]
  width: number
  height: number
  mass: number
}

export type Board = Array<Array<string | null>>

export type GameState = {
  board: Board
  rack: Array<RackPiece | null>
  score: number
  placements: number
  roundsCompleted: number
  totalLinesCleared: number
  totalPlacedCells: number
  totalClearedCells: number
  comboStreak: number
  maxCombo: number
  peakFillRatio: number
  occupancyHistory: number[]
  gameOver: boolean
  notice: string
  lastClearPulse: number
  lastClearedKeys: string[]
  lastClearedRows: number[]
  lastClearedColumns: number[]
}

export type BenchmarkPart = {
  label: string
  value: number
  weight: number
}

export type BenchmarkSummary = {
  overall: number
  rank: string
  label: string
  parts: BenchmarkPart[]
}

export type BestRun = {
  benchmarkScore: number
  benchmarkRank: string
  benchmarkLabel: string
  score: number
  linesCleared: number
  roundsCompleted: number
  placements: number
  maxCombo: number
  playedAt: string
}

type PieceDefinition = Omit<RackPiece, 'instanceId'>

type ClearResult = {
  board: Board
  clearedLines: number
  clearedRows: number[]
  clearedColumns: number[]
  clearedCells: number
  clearedKeys: string[]
}

let pieceInstanceCount = 0

function definePiece(
  id: string,
  name: string,
  color: string,
  cells: Array<[number, number]>,
): PieceDefinition {
  const mappedCells = cells.map(([x, y]) => ({ x, y }))
  const width = Math.max(...mappedCells.map((cell) => cell.x)) + 1
  const height = Math.max(...mappedCells.map((cell) => cell.y)) + 1

  return {
    id,
    name,
    color,
    cells: mappedCells,
    width,
    height,
    mass: mappedCells.length,
  }
}

const PIECE_LIBRARY: PieceDefinition[] = [
  definePiece('domino-h', 'Rail', '#ff9b6a', [
    [0, 0],
    [1, 0],
  ]),
  definePiece('domino-v', 'Pillar', '#ffd86e', [
    [0, 0],
    [0, 1],
  ]),
  definePiece('trio-h', 'Beam', '#72d66b', [
    [0, 0],
    [1, 0],
    [2, 0],
  ]),
  definePiece('trio-v', 'Tower', '#4fdac9', [
    [0, 0],
    [0, 1],
    [0, 2],
  ]),
  definePiece('square', 'Block', '#53b6ff', [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]),
  definePiece('cube-3', 'Mega Block', '#7f8dff', [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ]),
  definePiece('hook-right', 'Hook', '#8e74ff', [
    [0, 0],
    [0, 1],
    [1, 1],
  ]),
  definePiece('hook-left', 'Claw', '#c972ff', [
    [1, 0],
    [0, 1],
    [1, 1],
  ]),
  definePiece('line-h', 'Long Bar', '#ff78bd', [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ]),
  definePiece('line-v', 'Spire', '#ff8aa5', [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ]),
  definePiece('tee', 'Crown', '#ff84a8', [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ]),
  definePiece('zig', 'Zig', '#ff6c7a', [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ]),
  definePiece('zag', 'Zag', '#ff9f4f', [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ]),
  definePiece('ell-tall', 'Lifter', '#8dd26a', [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ]),
  definePiece('jay-tall', 'Brace', '#5c7dff', [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 2],
  ]),
]

function cloneBoard(board: Board) {
  return board.map((row) => [...row])
}

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )
}

function createRackPiece(definition: PieceDefinition): RackPiece {
  pieceInstanceCount += 1

  return {
    ...definition,
    instanceId: `${definition.id}-${pieceInstanceCount}`,
  }
}

function randomPiece() {
  const definition =
    PIECE_LIBRARY[Math.floor(Math.random() * PIECE_LIBRARY.length)]

  return createRackPiece(definition)
}

export function createRack(): Array<RackPiece | null> {
  return Array.from({ length: RACK_SIZE }, () => randomPiece())
}

export function isRackEmpty(rack: Array<RackPiece | null>) {
  return rack.every((piece) => piece === null)
}

export function getFillRatio(board: Board) {
  const filled = board.reduce(
    (total, row) => total + row.filter(Boolean).length,
    0,
  )

  return filled / (BOARD_SIZE * BOARD_SIZE)
}

export function canPlacePiece(
  board: Board,
  piece: RackPiece,
  originX: number,
  originY: number,
) {
  return piece.cells.every((cell) => {
    const x = originX + cell.x
    const y = originY + cell.y

    return (
      x >= 0 &&
      y >= 0 &&
      x < BOARD_SIZE &&
      y < BOARD_SIZE &&
      board[y][x] === null
    )
  })
}

export function clampPlacementOrigin(
  piece: RackPiece,
  originX: number,
  originY: number,
) {
  const maxX = Math.max(0, BOARD_SIZE - piece.width)
  const maxY = Math.max(0, BOARD_SIZE - piece.height)

  return {
    x: Math.max(0, Math.min(maxX, originX)),
    y: Math.max(0, Math.min(maxY, originY)),
  }
}

function placePiece(board: Board, piece: RackPiece, originX: number, originY: number) {
  const nextBoard = cloneBoard(board)

  piece.cells.forEach((cell) => {
    nextBoard[originY + cell.y][originX + cell.x] = piece.color
  })

  return nextBoard
}

function clearLines(board: Board): ClearResult {
  const rowsToClear: number[] = []
  const columnsToClear: number[] = []

  board.forEach((row, index) => {
    if (row.every(Boolean)) {
      rowsToClear.push(index)
    }
  })

  for (let column = 0; column < BOARD_SIZE; column += 1) {
    let filled = true

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (!board[row][column]) {
        filled = false
        break
      }
    }

    if (filled) {
      columnsToClear.push(column)
    }
  }

  if (rowsToClear.length === 0 && columnsToClear.length === 0) {
    return {
      board,
      clearedLines: 0,
      clearedRows: [],
      clearedColumns: [],
      clearedCells: 0,
      clearedKeys: [],
    }
  }

  const nextBoard = cloneBoard(board)
  const cleared = new Set<string>()

  rowsToClear.forEach((row) => {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      cleared.add(`${column}:${row}`)
      nextBoard[row][column] = null
    }
  })

  columnsToClear.forEach((column) => {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      cleared.add(`${column}:${row}`)
      nextBoard[row][column] = null
    }
  })

  return {
    board: nextBoard,
    clearedLines: rowsToClear.length + columnsToClear.length,
    clearedRows: rowsToClear,
    clearedColumns: columnsToClear,
    clearedCells: cleared.size,
    clearedKeys: [...cleared],
  }
}

export function pieceFitsAnywhere(board: Board, piece: RackPiece) {
  for (let y = 0; y <= BOARD_SIZE - piece.height; y += 1) {
    for (let x = 0; x <= BOARD_SIZE - piece.width; x += 1) {
      if (canPlacePiece(board, piece, x, y)) {
        return true
      }
    }
  }

  return false
}

export function hasAnyRackFit(board: Board, rack: Array<RackPiece | null>) {
  return rack.some((piece) => piece !== null && pieceFitsAnywhere(board, piece))
}

export function findFirstPlayableRackIndex(
  rack: Array<RackPiece | null>,
  board: Board,
) {
  const playableIndex = rack.findIndex(
    (piece) => piece !== null && pieceFitsAnywhere(board, piece),
  )

  return playableIndex === -1 ? null : playableIndex
}

export function createPreviewCells(piece: RackPiece, originX: number, originY: number) {
  const cells = new Map<string, string>()

  piece.cells.forEach((cell) => {
    cells.set(`${originX + cell.x}:${originY + cell.y}`, piece.color)
  })

  return cells
}

export function rotateRackPiece(piece: RackPiece, direction: 'cw' | 'ccw') {
  const rotatedCells = piece.cells.map((cell) =>
    direction === 'cw'
      ? { x: piece.height - 1 - cell.y, y: cell.x }
      : { x: cell.y, y: piece.width - 1 - cell.x },
  )
  const minX = Math.min(...rotatedCells.map((cell) => cell.x))
  const minY = Math.min(...rotatedCells.map((cell) => cell.y))
  const normalizedCells = rotatedCells.map((cell) => ({
    x: cell.x - minX,
    y: cell.y - minY,
  }))
  const width = Math.max(...normalizedCells.map((cell) => cell.x)) + 1
  const height = Math.max(...normalizedCells.map((cell) => cell.y)) + 1

  return {
    ...piece,
    cells: normalizedCells,
    width,
    height,
  }
}

function getScoreGain(
  piece: RackPiece,
  clearedLines: number,
  comboStreak: number,
  didCrossClear: boolean,
) {
  const placementScore = piece.mass * 10
  const lineScore = clearedLines * 140
  const comboScore = clearedLines > 0 ? comboStreak * 35 : 0
  const crossClearScore = didCrossClear ? 80 : 0

  return placementScore + lineScore + comboScore + crossClearScore
}

export function createInitialGameState(): GameState {
  const board = createEmptyBoard()
  const rack = createRack()

  return {
    board,
    rack,
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
    notice:
      'Drag a block onto the board, or click a block and then a cell to anchor its top-left corner.',
    lastClearPulse: 0,
    lastClearedKeys: [],
    lastClearedRows: [],
    lastClearedColumns: [],
  }
}

export function getPlacementResult(
  state: GameState,
  rackIndex: number,
  originX: number,
  originY: number,
): GameState {
  const piece = state.rack[rackIndex]

  if (!piece) {
    return state
  }

  const placedBoard = placePiece(state.board, piece, originX, originY)
  const clearResult = clearLines(placedBoard)
  const nextCombo = clearResult.clearedLines > 0 ? state.comboStreak + 1 : 0
  const didCrossClear =
    clearResult.clearedRows.length > 0 && clearResult.clearedColumns.length > 0
  const scoreGain = getScoreGain(
    piece,
    clearResult.clearedLines,
    nextCombo,
    didCrossClear,
  )

  let rack = state.rack.map((entry, index) => (index === rackIndex ? null : entry))
  let roundsCompleted = state.roundsCompleted
  let notice = `${piece.name} placed.`

  if (isRackEmpty(rack)) {
    rack = createRack()
    roundsCompleted += 1
    notice =
      clearResult.clearedLines > 0
        ? `Clean clear. Fresh draft ready.`
        : 'Rack spent. Four new blocks dealt.'
  } else if (clearResult.clearedLines > 0) {
    notice = `Cleared ${clearResult.clearedLines} line${clearResult.clearedLines === 1 ? '' : 's'}.`
  }

  const fillRatio = getFillRatio(clearResult.board)
  const occupancyHistory = [...state.occupancyHistory, fillRatio]
  const gameOver = !hasAnyRackFit(clearResult.board, rack)

  if (gameOver) {
    notice = 'No drafted piece can fit. The run is over.'
  }

  return {
    board: clearResult.board,
    rack,
    score: state.score + scoreGain,
    placements: state.placements + 1,
    roundsCompleted,
    totalLinesCleared: state.totalLinesCleared + clearResult.clearedLines,
    totalPlacedCells: state.totalPlacedCells + piece.mass,
    totalClearedCells: state.totalClearedCells + clearResult.clearedCells,
    comboStreak: nextCombo,
    maxCombo: Math.max(state.maxCombo, nextCombo),
    peakFillRatio: Math.max(state.peakFillRatio, fillRatio),
    occupancyHistory,
    gameOver,
    notice,
    lastClearPulse:
      clearResult.clearedLines > 0 ? state.lastClearPulse + 1 : state.lastClearPulse,
    lastClearedKeys: clearResult.clearedKeys,
    lastClearedRows: clearResult.clearedRows,
    lastClearedColumns: clearResult.clearedColumns,
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calculateBenchmark(state: GameState): BenchmarkSummary {
  const averageFillRatio =
    state.occupancyHistory.reduce((sum, value) => sum + value, 0) /
    state.occupancyHistory.length
  const clearPower = clampScore(
    state.totalLinesCleared * 8 + state.maxCombo * 6 + state.score / 80,
  )
  const efficiency = clampScore(
    state.totalPlacedCells === 0
      ? 0
      : (state.totalClearedCells / state.totalPlacedCells) * 150,
  )
  const endurance = clampScore(
    state.roundsCompleted * 18 + state.placements * 1.6,
  )
  const control = clampScore((1 - averageFillRatio) * 100)

  const overall = clampScore(
    clearPower * 0.34 +
      efficiency * 0.26 +
      endurance * 0.24 +
      control * 0.16,
  )

  if (overall >= 95) {
    return {
      overall,
      rank: 'S+',
      label: 'Matrix Legend',
      parts: [
        { label: 'Clear power', value: clearPower, weight: 34 },
        { label: 'Efficiency', value: efficiency, weight: 26 },
        { label: 'Endurance', value: endurance, weight: 24 },
        { label: 'Board control', value: control, weight: 16 },
      ],
    }
  }

  if (overall >= 88) {
    return {
      overall,
      rank: 'S',
      label: 'Grid Savant',
      parts: [
        { label: 'Clear power', value: clearPower, weight: 34 },
        { label: 'Efficiency', value: efficiency, weight: 26 },
        { label: 'Endurance', value: endurance, weight: 24 },
        { label: 'Board control', value: control, weight: 16 },
      ],
    }
  }

  if (overall >= 76) {
    return {
      overall,
      rank: 'A',
      label: 'Stack Architect',
      parts: [
        { label: 'Clear power', value: clearPower, weight: 34 },
        { label: 'Efficiency', value: efficiency, weight: 26 },
        { label: 'Endurance', value: endurance, weight: 24 },
        { label: 'Board control', value: control, weight: 16 },
      ],
    }
  }

  if (overall >= 64) {
    return {
      overall,
      rank: 'B',
      label: 'Line Builder',
      parts: [
        { label: 'Clear power', value: clearPower, weight: 34 },
        { label: 'Efficiency', value: efficiency, weight: 26 },
        { label: 'Endurance', value: endurance, weight: 24 },
        { label: 'Board control', value: control, weight: 16 },
      ],
    }
  }

  if (overall >= 52) {
    return {
      overall,
      rank: 'C',
      label: 'Rough Cut',
      parts: [
        { label: 'Clear power', value: clearPower, weight: 34 },
        { label: 'Efficiency', value: efficiency, weight: 26 },
        { label: 'Endurance', value: endurance, weight: 24 },
        { label: 'Board control', value: control, weight: 16 },
      ],
    }
  }

  return {
    overall,
    rank: 'D',
    label: 'Fallen Stack',
    parts: [
      { label: 'Clear power', value: clearPower, weight: 34 },
      { label: 'Efficiency', value: efficiency, weight: 26 },
      { label: 'Endurance', value: endurance, weight: 24 },
      { label: 'Board control', value: control, weight: 16 },
    ],
  }
}
