import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import './App.css'
import {
  BOARD_SIZE,
  RACK_SIZE,
  calculateBenchmark,
  canPlacePiece,
  clampPlacementOrigin,
  createInitialGameState,
  createPreviewCells,
  findFirstPlayableRackIndex,
  getFillRatio,
  getPlacementResult,
  hasAnyRackFit,
  isRackEmpty,
  rotateRackPiece,
  type BestRun,
  type Coordinate,
  type GameState,
  type RackPiece,
} from './game'

const STORAGE_KEY = 'grid-forge-best-run-v2'

function readBestRun(): BestRun | null {
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

function saveBestRun(bestRun: BestRun) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bestRun))
}

function getBenchmarkCopy(state: GameState) {
  return calculateBenchmark(state)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function pickNextSelection(rack: Array<RackPiece | null>, board: GameState['board']) {
  return findFirstPlayableRackIndex(rack, board)
}

function createBestRun(state: GameState): BestRun {
  const benchmark = getBenchmarkCopy(state)

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

function renderPieceCells(piece: RackPiece, className = '') {
  const previewSize = 4
  const offsetX = Math.floor((previewSize - piece.width) / 2)
  const offsetY = Math.floor((previewSize - piece.height) / 2)
  const occupied = new Set(
    piece.cells.map((cell) => `${cell.x + offsetX}:${cell.y + offsetY}`),
  )

  return (
    <div
      className={`piece-mini-grid ${className}`.trim()}
      style={
        {
          '--piece-columns': previewSize,
          '--piece-rows': previewSize,
          '--piece-color': piece.color,
        } as CSSProperties
      }
    >
      {Array.from({ length: previewSize * previewSize }, (_, index) => {
        const x = index % previewSize
        const y = Math.floor(index / previewSize)
        const key = `${x}:${y}`

        return (
          <span
            key={key}
            className={`piece-mini-cell ${occupied.has(key) ? 'filled' : ''}`}
          />
        )
      })}
    </div>
  )
}

type DragState = {
  rackIndex: number
  pointerId: number
  pointerX: number
  pointerY: number
}

type PressState = {
  rackIndex: number
  pointerId: number
  originX: number
  originY: number
  latestX: number
  latestY: number
  longPressTriggered: boolean
}

type ClearAnimationState = {
  pulse: number
  keys: Set<string>
  rows: number[]
  columns: number[]
}

function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState())
  const [bestRun, setBestRun] = useState<BestRun | null>(() => readBestRun())
  const [isCoarsePointer, setIsCoarsePointer] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(pointer: coarse)').matches
      : false,
  )
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [hoveredCell, setHoveredCell] = useState<Coordinate | null>(null)
  const [clearAnimation, setClearAnimation] = useState<ClearAnimationState | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const clearAnimationTimerRef = useRef<number | null>(null)
  const pressStateRef = useRef<PressState | null>(null)
  const suppressClickRef = useRef(false)

  const benchmark = useMemo(() => getBenchmarkCopy(game), [game])
  const activeRackIndex = dragState?.rackIndex ?? selectedRackIndex
  const selectedPiece =
    activeRackIndex === null ? null : game.rack[activeRackIndex] ?? null
  const remainingPieces = game.rack.filter(Boolean).length
  const resolvedHoverOrigin = useMemo(() => {
    if (!selectedPiece || !hoveredCell) {
      return null
    }

    return clampPlacementOrigin(selectedPiece, hoveredCell.x, hoveredCell.y)
  }, [hoveredCell, selectedPiece])
  const preview = useMemo(() => {
    if (!selectedPiece || !resolvedHoverOrigin) {
      return null
    }

    return {
      cells: createPreviewCells(selectedPiece, resolvedHoverOrigin.x, resolvedHoverOrigin.y),
      valid: canPlacePiece(
        game.board,
        selectedPiece,
        resolvedHoverOrigin.x,
        resolvedHoverOrigin.y,
      ),
      snapped:
        hoveredCell !== null &&
        (resolvedHoverOrigin.x !== hoveredCell.x || resolvedHoverOrigin.y !== hoveredCell.y),
    }
  }, [game.board, hoveredCell, resolvedHoverOrigin, selectedPiece])
  const previewBounds = useMemo(() => {
    if (!selectedPiece || !resolvedHoverOrigin) {
      return null
    }

    return {
      x: resolvedHoverOrigin.x,
      y: resolvedHoverOrigin.y,
      width: selectedPiece.width,
      height: selectedPiece.height,
    }
  }, [resolvedHoverOrigin, selectedPiece])

  useEffect(() => {
    if (game.placements === 0 || !game.gameOver) {
      return
    }

    const currentRun = createBestRun(game)

    if (
      !bestRun ||
      currentRun.benchmarkScore > bestRun.benchmarkScore ||
      (currentRun.benchmarkScore === bestRun.benchmarkScore &&
        currentRun.score > bestRun.score)
    ) {
      setBestRun(currentRun)
      saveBestRun(currentRun)
    }
  }, [bestRun, game])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const updatePointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches)
    }

    updatePointerMode()
    mediaQuery.addEventListener('change', updatePointerMode)

    return () => {
      mediaQuery.removeEventListener('change', updatePointerMode)
    }
  }, [])

  useEffect(() => {
    const nextSelection = pickNextSelection(game.rack, game.board)

    if (selectedRackIndex === null) {
      if (nextSelection !== null) {
        setSelectedRackIndex(nextSelection)
      }
      return
    }

    const currentPiece = game.rack[selectedRackIndex]

    if (!currentPiece || !hasAnyRackFit(game.board, [currentPiece])) {
      setSelectedRackIndex(nextSelection)
    }
  }, [game, selectedRackIndex])

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current)
      }

      if (clearAnimationTimerRef.current !== null) {
        window.clearTimeout(clearAnimationTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (game.lastClearPulse === 0 || game.lastClearedKeys.length === 0) {
      return
    }

    if (clearAnimationTimerRef.current !== null) {
      window.clearTimeout(clearAnimationTimerRef.current)
    }

    setClearAnimation({
      pulse: game.lastClearPulse,
      keys: new Set(game.lastClearedKeys),
      rows: game.lastClearedRows,
      columns: game.lastClearedColumns,
    })

    clearAnimationTimerRef.current = window.setTimeout(() => {
      setClearAnimation(null)
      clearAnimationTimerRef.current = null
    }, 620)
  }, [
    game.lastClearPulse,
    game.lastClearedColumns,
    game.lastClearedKeys,
    game.lastClearedRows,
  ])

  useEffect(() => {
    if (isCoarsePointer || typeof window === 'undefined') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) {
        return
      }

      if (event.key.toLowerCase() !== 'r') {
        return
      }

      event.preventDefault()
      handleRotate('cw')
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCoarsePointer, selectedRackIndex, activeRackIndex, game.rack])

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const getBoardCoordinate = (
    clientX: number,
    clientY: number,
    options?: { clampToBounds?: boolean },
  ) => {
    if (!boardRef.current) {
      return null
    }

    const rect = boardRef.current.getBoundingClientRect()
    const clampToBounds = options?.clampToBounds ?? false

    if (
      !clampToBounds &&
      (clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom)
    ) {
      return null
    }

    const boundedX = Math.min(Math.max(clientX, rect.left + 0.001), rect.right - 0.001)
    const boundedY = Math.min(Math.max(clientY, rect.top + 0.001), rect.bottom - 0.001)
    const x = Math.floor(((boundedX - rect.left) / rect.width) * BOARD_SIZE)
    const y = Math.floor(((boundedY - rect.top) / rect.height) * BOARD_SIZE)

    return {
      x: Math.max(0, Math.min(BOARD_SIZE - 1, x)),
      y: Math.max(0, Math.min(BOARD_SIZE - 1, y)),
    }
  }

  const beginPointerDrag = (
    rackIndex: number,
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => {
    suppressClickRef.current = true
    setSelectedRackIndex(rackIndex)
    setDragState({
      rackIndex,
      pointerId,
      pointerX: clientX,
      pointerY: clientY,
    })
    setHoveredCell(getBoardCoordinate(clientX, clientY, { clampToBounds: true }))
  }

  const startNewGame = () => {
    const nextGame = createInitialGameState()
    setGame(nextGame)
    setHoveredCell(null)
    setDragState(null)
    setClearAnimation(null)
    setSelectedRackIndex(pickNextSelection(nextGame.rack, nextGame.board))
  }

  const handleRackSelect = (index: number) => {
    const piece = game.rack[index]

    if (!piece) {
      return
    }

    setSelectedRackIndex((current) => (current === index ? null : index))
  }

  const placeRackPiece = (rackIndex: number, x: number, y: number) => {
    if (game.gameOver) {
      return
    }

    const piece = game.rack[rackIndex]

    if (!piece) {
      return
    }

    const resolvedOrigin = clampPlacementOrigin(piece, x, y)

    if (!canPlacePiece(game.board, piece, resolvedOrigin.x, resolvedOrigin.y)) {
      setGame((current) => ({
        ...current,
        notice: `No room for ${piece.name.toLowerCase()} at ${resolvedOrigin.x + 1}, ${resolvedOrigin.y + 1}.`,
      }))
      return
    }

    const result = getPlacementResult(game, rackIndex, resolvedOrigin.x, resolvedOrigin.y)
    setGame(result)
    setHoveredCell(null)
    setDragState(null)
    setSelectedRackIndex(pickNextSelection(result.rack, result.board))
  }

  const handleBoardClick = (x: number, y: number) => {
    if (activeRackIndex === null) {
      return
    }

    placeRackPiece(activeRackIndex, x, y)
  }

  const handleRackPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const piece = game.rack[index]

    if (!piece) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    clearLongPress()
    pressStateRef.current = {
      rackIndex: index,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      longPressTriggered: false,
    }

    longPressTimerRef.current = window.setTimeout(() => {
      const pressState = pressStateRef.current

      if (!pressState || pressState.pointerId !== event.pointerId) {
        return
      }

      pressState.longPressTriggered = true
      beginPointerDrag(
        pressState.rackIndex,
        pressState.pointerId,
        pressState.latestX,
        pressState.latestY,
      )
    }, 260)
  }

  const handleRackPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const pressState = pressStateRef.current

    if (pressState && pressState.pointerId === event.pointerId) {
      pressState.latestX = event.clientX
      pressState.latestY = event.clientY

      if (!pressState.longPressTriggered) {
        const delta = Math.hypot(
          event.clientX - pressState.originX,
          event.clientY - pressState.originY,
        )

        if (delta > 10) {
          clearLongPress()
        }
      }
    }

    if (!dragState || dragState.pointerId !== event.pointerId || dragState.rackIndex !== index) {
      return
    }

    setDragState({
      rackIndex: index,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
    })
    setHoveredCell(getBoardCoordinate(event.clientX, event.clientY, { clampToBounds: true }))
  }

  const finishPointerInteraction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    clearLongPress()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const currentDrag = dragState
    const dropCell = getBoardCoordinate(event.clientX, event.clientY)
    const pressState = pressStateRef.current

    pressStateRef.current = null

    if (
      isCoarsePointer &&
      pressState &&
      pressState.pointerId === event.pointerId &&
      !pressState.longPressTriggered
    ) {
      suppressClickRef.current = true
      setSelectedRackIndex(index)
      handleRotate('cw', index)
      setHoveredCell(null)
      return
    }

    if (!currentDrag || currentDrag.pointerId !== event.pointerId || currentDrag.rackIndex !== index) {
      return
    }

    setDragState(null)

    if (dropCell) {
      placeRackPiece(index, dropCell.x, dropCell.y)
    } else {
      setHoveredCell(null)
    }
  }

  const cancelPointerInteraction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    clearLongPress()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    pressStateRef.current = null

    if (dragState?.pointerId === event.pointerId && dragState.rackIndex === index) {
      setDragState(null)
      setHoveredCell(null)
    }
  }

  const handleRackCardClick = (index: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (isCoarsePointer) {
      setSelectedRackIndex(index)
      handleRotate('cw', index)
      return
    }

    handleRackSelect(index)
  }

  const handleRotate = (
    direction: 'cw' | 'ccw',
    explicitIndex?: number,
  ) => {
    const targetIndex = explicitIndex ?? selectedRackIndex ?? activeRackIndex

    if (targetIndex === null) {
      return
    }

    setGame((current) => {
      const piece = current.rack[targetIndex]

      if (!piece) {
        return current
      }

      const rack = current.rack.map((entry, index) =>
        index === targetIndex ? rotateRackPiece(piece, direction) : entry,
      )

      return {
        ...current,
        rack,
        notice: `${piece.name} rotated ${direction === 'cw' ? 'clockwise' : 'counterclockwise'}.`,
      }
    })

    setSelectedRackIndex(targetIndex)
  }

  const fillRatio = getFillRatio(game.board)
  const isDraggingPiece = dragState !== null && selectedPiece !== null
  const mobilePlacementCopy =
    isCoarsePointer && isDraggingPiece && selectedPiece && resolvedHoverOrigin
      ? {
          title: selectedPiece.name,
          detail: `${preview?.valid ? 'Release at' : 'Blocked at'} ${resolvedHoverOrigin.x + 1}, ${resolvedHoverOrigin.y + 1}`,
        }
      : null
  const isNewRecord =
    bestRun !== null &&
    game.gameOver &&
    game.score > 0 &&
    bestRun.score === game.score &&
    bestRun.benchmarkScore === benchmark.overall
  const gameOverHeadline = isNewRecord ? 'New Best Run' : 'No More Moves'
  const gameOverCopy = isNewRecord
    ? 'You squeezed out your strongest run so far. Reset and see if you can beat the new mark.'
    : 'None of the remaining draft pieces can fit on the board. Reset to start a fresh run.'

  const renderRackSection = (mode: 'desktop' | 'mobile') => (
    <section
      className={`sidebar-card rack-panel ${mode}-only ${mode === 'mobile' ? 'mobile-draft-dock' : ''}`}
    >
      <div className="card-header">
        <div>
          <p className="card-label">Rack</p>
          <h2>{mode === 'mobile' ? 'Draft Tray' : 'Current Draft'}</h2>
        </div>
        <p className="card-note">
          {isRackEmpty(game.rack)
            ? 'Fresh pieces arrive after this turn resolves.'
            : `${remainingPieces}/${RACK_SIZE} pieces remaining`}
        </p>
      </div>

      <div className={`rack-grid ${mode === 'mobile' ? 'mobile-rack-grid' : ''}`}>
        {game.rack.map((piece, index) => {
          const isSelected = selectedRackIndex === index
          const isPlayable = piece ? hasAnyRackFit(game.board, [piece]) : false

          return (
            <button
              key={`${mode}-${piece?.instanceId ?? `empty-${index}`}`}
              type="button"
              draggable={false}
              className={`rack-card ${isSelected ? 'selected' : ''} ${dragState?.rackIndex === index ? 'dragging' : ''} ${!piece ? 'spent' : ''} ${mode === 'mobile' ? 'mobile-rack-card' : ''}`}
              onClick={() => handleRackCardClick(index)}
              disabled={!piece}
              onPointerDown={(event) => handleRackPointerDown(event, index)}
              onPointerMove={(event) => handleRackPointerMove(event, index)}
              onPointerUp={(event) => finishPointerInteraction(event, index)}
              onPointerCancel={(event) => cancelPointerInteraction(event, index)}
            >
              {piece ? (
                <>
                  <div className="rack-card-top">
                    <div>
                      <p className="rack-name">{piece.name}</p>
                      <p className="rack-meta">
                        {piece.mass} cells / {piece.width}x{piece.height}
                      </p>
                    </div>
                    <span className={`fit-badge ${isPlayable ? 'playable' : 'blocked'}`}>
                      {isPlayable ? 'Fits' : 'Blocked'}
                    </span>
                  </div>
                  {renderPieceCells(piece)}
                </>
              ) : (
                <div className="rack-empty">
                  <span>Placed</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className={`interaction-copy ${mode === 'mobile' ? 'mobile-interaction-copy' : ''}`}>
        {isCoarsePointer
          ? 'Tap a piece to rotate it clockwise. Long-press a piece to drag it onto the board and release to place it.'
          : 'Click a piece to select it, then click a board cell to place it. Press R to rotate clockwise, or long-press to drag and drop.'}
      </p>
    </section>
  )

  const renderRunPanel = (mode: 'desktop' | 'mobile') => (
    <section className={`sidebar-card ${mode}-only`}>
      <div className="card-header">
        <div>
          <p className="card-label">Run</p>
          <h2>{mode === 'mobile' ? 'Run Stats' : 'Run Console'}</h2>
        </div>
        <div className="hud-rank">
          <span>{benchmark.rank}</span>
          <strong>{benchmark.overall}</strong>
        </div>
      </div>

      <div className="run-summary">
        <div className="summary-block">
          <span className="summary-label">Benchmark</span>
          <strong>{benchmark.label}</strong>
        </div>
        <div className="summary-block">
          <span className="summary-label">Status</span>
          <strong>{game.gameOver ? 'Failed' : 'Live'}</strong>
        </div>
      </div>

      <div className={`metric-grid ${mode === 'mobile' ? 'mobile-metric-grid' : ''}`}>
        <div className="metric-card">
          <span>Score</span>
          <strong>{game.score}</strong>
        </div>
        <div className="metric-card">
          <span>Lines cleared</span>
          <strong>{game.totalLinesCleared}</strong>
        </div>
        <div className="metric-card">
          <span>Rounds survived</span>
          <strong>{game.roundsCompleted}</strong>
        </div>
        <div className="metric-card">
          <span>Best combo</span>
          <strong>{game.maxCombo}</strong>
        </div>
        <div className="metric-card">
          <span>Efficiency</span>
          <strong>
            {game.totalPlacedCells === 0
              ? '0%'
              : `${Math.round((game.totalClearedCells / game.totalPlacedCells) * 100)}%`}
          </strong>
        </div>
      </div>

      <div className={`mobile-benchmark-breakdown ${mode === 'desktop' ? 'desktop-breakdown' : ''}`}>
        {benchmark.parts.map((part) => (
          <div key={part.label} className="mobile-benchmark-pill">
            <span>{part.label}</span>
            <strong>{part.value}</strong>
          </div>
        ))}
      </div>

      {bestRun ? (
        <div className={`record-grid ${mode === 'mobile' ? 'mobile-record-grid' : ''}`}>
          <div className="record-item">
            <span>Best benchmark</span>
            <strong>
              {bestRun.benchmarkScore} / {bestRun.benchmarkRank}
            </strong>
          </div>
          <div className="record-item">
            <span>Best score</span>
            <strong>{bestRun.score}</strong>
          </div>
          <div className="record-item">
            <span>Lines</span>
            <strong>{bestRun.linesCleared}</strong>
          </div>
          <div className="record-item">
            <span>Rounds</span>
            <strong>{bestRun.roundsCompleted}</strong>
          </div>
          <div className="record-item">
            <span>Best combo</span>
            <strong>{bestRun.maxCombo}</strong>
          </div>
          <p className="record-date">{formatDate(bestRun.playedAt)}</p>
        </div>
      ) : (
        <p className="empty-copy">
          Finish a run to save a local benchmark record in this browser.
        </p>
      )}
    </section>
  )

  return (
    <main className="app-shell">
      <section className="top-strip desktop-only">
        <div className="title-cluster">
          <p className="eyebrow">Grid Forge</p>
          <h1>10x10 Tactical Stack</h1>
        </div>
        <div className="top-metrics">
          <div className="top-metric">
            <span>Score</span>
            <strong>{game.score}</strong>
          </div>
          <div className="top-metric">
            <span>Rank</span>
            <strong>{benchmark.rank}</strong>
          </div>
          <div className="top-metric">
            <span>Pieces</span>
            <strong>{remainingPieces}</strong>
          </div>
          <div className="top-metric">
            <span>Board</span>
            <strong>{formatPercent(fillRatio)}</strong>
          </div>
        </div>
      </section>

      <section className="mobile-topbar mobile-only">
        <div className="mobile-brand">
          <p className="eyebrow">Grid Forge</p>
          <h1>10x10 Run</h1>
        </div>

        <div className="mobile-stat-strip">
          <div className="mobile-stat">
            <span>Score</span>
            <strong>{game.score}</strong>
          </div>
          <div className="mobile-stat">
            <span>Rank</span>
            <strong>{benchmark.rank}</strong>
          </div>
          <div className="mobile-stat">
            <span>Pieces</span>
            <strong>{remainingPieces}</strong>
          </div>
        </div>
      </section>

      <section className="game-grid">
        <div className="board-card">
          <div className="card-header">
            <div>
              <p className="card-label">Board</p>
              <h2>Placement Arena</h2>
            </div>
            <p className="card-note">
              Fill entire rows or columns to erase them. Current occupancy:{' '}
              <strong>{formatPercent(fillRatio)}</strong>
            </p>
          </div>

          <div className={`board-wrap ${isDraggingPiece ? 'drag-active' : ''}`}>
            {mobilePlacementCopy ? (
              <div className={`placement-readout ${preview?.valid ? 'valid' : 'invalid'}`}>
                <strong>{mobilePlacementCopy.title}</strong>
                <span>{mobilePlacementCopy.detail}</span>
              </div>
            ) : null}

            <div
              className="board-grid"
              ref={boardRef}
              style={
                {
                  '--board-size': BOARD_SIZE,
                  '--board-gap': '3px',
                } as CSSProperties
              }
            >
              {game.board.map((row, y) =>
                row.map((cell, x) => {
                  const previewKey = `${x}:${y}`
                  const previewCell = preview?.cells.get(previewKey)
                  const isClearing = clearAnimation?.keys.has(previewKey) ?? false
                  const previewClass = previewCell
                    ? preview?.valid
                      ? 'preview-valid'
                      : 'preview-invalid'
                    : ''
                  const cellStyle =
                    cell || (previewCell && selectedPiece)
                      ? ({
                          ...(cell ? { '--cell-color': cell } : {}),
                          ...(previewCell && selectedPiece
                            ? { '--piece-color': selectedPiece.color }
                            : {}),
                        } as CSSProperties)
                      : undefined

                  return (
                    <button
                      key={previewKey}
                      type="button"
                      className={`board-cell ${cell ? 'filled' : ''} ${isClearing ? 'clearing' : ''} ${previewClass} ${resolvedHoverOrigin?.x === x && resolvedHoverOrigin?.y === y ? 'drop-target' : ''}`}
                      style={cellStyle}
                      onMouseEnter={() => setHoveredCell({ x, y })}
                      onFocus={() => setHoveredCell({ x, y })}
                      onClick={() => handleBoardClick(x, y)}
                      aria-label={`Board cell ${x + 1}, ${y + 1}`}
                    />
                  )
                }),
              )}

              {clearAnimation?.rows.map((row) => (
                <div
                  key={`row-${clearAnimation.pulse}-${row}`}
                  className="line-sweep row"
                  style={
                    {
                      '--line-index': row,
                    } as CSSProperties
                  }
                />
              ))}

              {clearAnimation?.columns.map((column) => (
                <div
                  key={`column-${clearAnimation.pulse}-${column}`}
                  className="line-sweep column"
                  style={
                    {
                      '--line-index': column,
                    } as CSSProperties
                  }
                />
              ))}

              {isDraggingPiece && resolvedHoverOrigin && previewBounds && selectedPiece ? (
                <>
                  <div
                    className={`placement-footprint ${preview?.valid ? 'valid' : 'invalid'}`}
                    style={
                      {
                        '--footprint-x': previewBounds.x,
                        '--footprint-y': previewBounds.y,
                        '--footprint-width': previewBounds.width,
                        '--footprint-height': previewBounds.height,
                        '--piece-color': selectedPiece.color,
                      } as CSSProperties
                    }
                  >
                    {selectedPiece.cells.map((cell) => (
                      <span
                        key={`footprint-${cell.x}-${cell.y}`}
                        className="placement-footprint-cell"
                        style={
                          {
                            '--footprint-cell-x': cell.x,
                            '--footprint-cell-y': cell.y,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>

                  <div
                    className={`placement-anchor ${preview?.valid ? 'valid' : 'invalid'}`}
                    style={
                      {
                        '--anchor-x': resolvedHoverOrigin.x,
                        '--anchor-y': resolvedHoverOrigin.y,
                      } as CSSProperties
                    }
                  >
                    <span>{preview?.valid ? 'Drop' : 'Blocked'}</span>
                  </div>
                </>
              ) : null}
            </div>

            {game.gameOver ? (
              <div className="gameover-overlay">
                <p className="eyebrow">Run Over</p>
                <h3>{gameOverHeadline}</h3>
                <p className="gameover-copy">{gameOverCopy}</p>

                <div className="gameover-metrics">
                  <div className="gameover-metric">
                    <span>Score</span>
                    <strong>{game.score}</strong>
                  </div>
                  <div className="gameover-metric">
                    <span>Rank</span>
                    <strong>
                      {benchmark.rank} / {benchmark.overall}
                    </strong>
                  </div>
                  <div className="gameover-metric">
                    <span>Lines</span>
                    <strong>{game.totalLinesCleared}</strong>
                  </div>
                  <div className="gameover-metric">
                    <span>Rounds</span>
                    <strong>{game.roundsCompleted}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="gameover-button"
                  onClick={startNewGame}
                >
                  Run it back
                </button>
              </div>
            ) : null}
          </div>

          <div className="notice-row">
            <p className={`notice-pill ${game.gameOver ? 'failed' : ''}`}>{game.notice}</p>
            <button type="button" className="reset-button" onClick={startNewGame}>
              New run
            </button>
          </div>
        </div>

        <aside className="sidebar desktop-only">
          {renderRackSection('desktop')}
          {renderRunPanel('desktop')}
        </aside>
      </section>

      <section className="mobile-stack mobile-only">
        {renderRackSection('mobile')}
        {renderRunPanel('mobile')}
      </section>

      {dragState && selectedPiece ? (
        <div
          className={`drag-ghost ${isCoarsePointer ? 'mobile-drag-ghost' : 'desktop-drag-ghost'}`}
          style={
            {
              '--drag-x': `${dragState.pointerX}px`,
              '--drag-y': `${dragState.pointerY}px`,
            } as CSSProperties
          }
        >
          {isCoarsePointer ? (
            <>
              <span className="drag-ghost-label">{selectedPiece.name}</span>
              <span className={`drag-ghost-hint ${preview?.valid ? 'valid' : 'invalid'}`}>
                {preview?.valid ? 'Release to place' : 'Blocked'}
              </span>
            </>
          ) : (
            renderPieceCells(selectedPiece, 'drag-piece-grid desktop-drag-piece-grid')
          )}
        </div>
      ) : null}
    </main>
  )
}

export default App
