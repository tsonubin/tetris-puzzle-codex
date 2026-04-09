import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import './App.css'
import {
  BOARD_SIZE,
  calculateBenchmark,
  canPlacePiece,
  clampPlacementOrigin,
  createPreviewCells,
  getFillRatio,
  getPlacementResult,
  rotateRackPiece,
  type BestRun,
  type Coordinate,
  type GameState,
} from './game'
import {
  createBestRun,
  createInitialSession,
  pickNextSelection,
  readBestRun,
  readMusicEnabled,
  saveBestRun,
  saveMusicEnabled,
} from './app/session'
import { GameBoard } from './components/GameBoard'
import { MusicToggle } from './components/MusicToggle'
import { PiecePreview } from './components/PiecePreview'
import { RackPanel } from './components/RackPanel'
import { RunPanel } from './components/RunPanel'
import { createSfxController, type SfxController } from './sfx'

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

const MOBILE_DRAG_DROP_OFFSET = {
  x: 0,
  y: -86,
}

function App() {
  const [initialSession] = useState(createInitialSession)
  const [game, setGame] = useState<GameState>(() => initialSession.game)
  const [bestRun, setBestRun] = useState<BestRun | null>(() => readBestRun())
  const [musicEnabled, setMusicEnabled] = useState(() => readMusicEnabled())
  const [isCoarsePointer, setIsCoarsePointer] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(pointer: coarse)').matches
      : false,
  )
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(
    () => initialSession.selectedRackIndex,
  )
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [hoveredCell, setHoveredCell] = useState<Coordinate | null>(null)
  const [clearAnimation, setClearAnimation] = useState<ClearAnimationState | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const clearAnimationTimerRef = useRef<number | null>(null)
  const pressStateRef = useRef<PressState | null>(null)
  const suppressClickRef = useRef(false)
  const sfxRef = useRef<SfxController | null>(null)
  const previousGameOverRef = useRef(game.gameOver)

  const benchmark = useMemo(() => calculateBenchmark(game), [game])
  const activeRackIndex = dragState?.rackIndex ?? selectedRackIndex
  const selectedPiece =
    activeRackIndex === null ? null : game.rack[activeRackIndex] ?? null
  const remainingPieces = game.rack.filter(Boolean).length
  const fillRatio = getFillRatio(game.board)
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
    }
  }, [game.board, resolvedHoverOrigin, selectedPiece])
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

  const getSfx = () => {
    if (!sfxRef.current) {
      sfxRef.current = createSfxController()
    }

    return sfxRef.current
  }

  const maybeStoreBestRun = (state: GameState) => {
    if (state.placements === 0 || !state.gameOver) {
      return
    }

    const currentRun = createBestRun(state)

    if (
      !bestRun ||
      currentRun.benchmarkScore > bestRun.benchmarkScore ||
      (currentRun.benchmarkScore === bestRun.benchmarkScore &&
        currentRun.score > bestRun.score)
    ) {
      setBestRun(currentRun)
      saveBestRun(currentRun)
    }
  }

  const triggerClearAnimation = (state: GameState) => {
    if (state.lastClearPulse === 0 || state.lastClearedKeys.length === 0) {
      return
    }

    if (clearAnimationTimerRef.current !== null) {
      window.clearTimeout(clearAnimationTimerRef.current)
    }

    setClearAnimation({
      pulse: state.lastClearPulse,
      keys: new Set(state.lastClearedKeys),
      rows: state.lastClearedRows,
      columns: state.lastClearedColumns,
    })
    getSfx().clear(state.lastClearedRows.length + state.lastClearedColumns.length)

    clearAnimationTimerRef.current = window.setTimeout(() => {
      setClearAnimation(null)
      clearAnimationTimerRef.current = null
    }, 620)
  }

  useEffect(() => {
    getSfx().setMusicEnabled(musicEnabled)
    saveMusicEnabled(musicEnabled)
  }, [musicEnabled])

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

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current)
      }

      if (clearAnimationTimerRef.current !== null) {
        window.clearTimeout(clearAnimationTimerRef.current)
      }

      sfxRef.current?.dispose()
    },
    [],
  )

  const handleRotate = (direction: 'cw' | 'ccw', explicitIndex?: number) => {
    const targetIndex = explicitIndex ?? selectedRackIndex ?? activeRackIndex

    if (targetIndex === null) {
      return
    }

    getSfx().unlock()
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

    getSfx().rotate()
    setSelectedRackIndex(targetIndex)
  }

  const handleKeyboardRotate = useEffectEvent(() => {
    handleRotate('cw')
  })

  useEffect(() => {
    if (isCoarsePointer || typeof window === 'undefined') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.key.toLowerCase() !== 'r') {
        return
      }

      event.preventDefault()
      handleKeyboardRotate()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCoarsePointer])

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

  const getDragDropCoordinate = (
    clientX: number,
    clientY: number,
    options?: { clampToBounds?: boolean },
  ) => {
    const adjustedX = isCoarsePointer ? clientX + MOBILE_DRAG_DROP_OFFSET.x : clientX
    const adjustedY = isCoarsePointer ? clientY + MOBILE_DRAG_DROP_OFFSET.y : clientY

    return getBoardCoordinate(adjustedX, adjustedY, options)
  }

  const beginPointerDrag = (
    rackIndex: number,
    pointerId: number,
    clientX: number,
    clientY: number,
  ) => {
    suppressClickRef.current = true
    getSfx().unlock()
    setSelectedRackIndex(rackIndex)
    setDragState({
      rackIndex,
      pointerId,
      pointerX: clientX,
      pointerY: clientY,
    })
    setHoveredCell(getDragDropCoordinate(clientX, clientY, { clampToBounds: true }))
  }

  const startNewGame = () => {
    getSfx().unlock()
    getSfx().reset()
    const nextSession = createInitialSession()
    setGame(nextSession.game)
    setHoveredCell(null)
    setDragState(null)
    setClearAnimation(null)
    setSelectedRackIndex(nextSession.selectedRackIndex)
  }

  const handleRackSelect = (index: number) => {
    const piece = game.rack[index]

    if (!piece) {
      return
    }

    getSfx().unlock()
    if (selectedRackIndex !== index) {
      getSfx().select()
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

    getSfx().unlock()
    const resolvedOrigin = clampPlacementOrigin(piece, x, y)

    if (!canPlacePiece(game.board, piece, resolvedOrigin.x, resolvedOrigin.y)) {
      getSfx().error()
      setGame((current) => ({
        ...current,
        notice: `No room for ${piece.name.toLowerCase()} at ${resolvedOrigin.x + 1}, ${resolvedOrigin.y + 1}.`,
      }))
      return
    }

    const result = getPlacementResult(game, rackIndex, resolvedOrigin.x, resolvedOrigin.y)
    getSfx().place(piece.mass)
    setGame(result)
    triggerClearAnimation(result)
    maybeStoreBestRun(result)
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

    getSfx().unlock()
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
    setHoveredCell(
      getDragDropCoordinate(event.clientX, event.clientY, { clampToBounds: true }),
    )
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
    const dropCell = getDragDropCoordinate(event.clientX, event.clientY)
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

  useEffect(() => {
    if (!previousGameOverRef.current && game.gameOver) {
      getSfx().gameOver()
    }

    previousGameOverRef.current = game.gameOver
  }, [game.gameOver])

  const handleMusicToggle = () => {
    getSfx().unlock()
    setMusicEnabled((current) => !current)
  }

  return (
    <main className="app-shell">
      <section className="top-strip desktop-only">
        <div className="title-cluster">
          <p className="eyebrow">Grid Forge</p>
          <h1>10x10 Tactical Stack</h1>
        </div>
        <div className="top-strip-controls">
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
              <span>Lines</span>
              <strong>{game.totalLinesCleared}</strong>
            </div>
            <div className="top-metric">
              <span>Pieces</span>
              <strong>{remainingPieces}</strong>
            </div>
          </div>
          <MusicToggle
            mode="desktop"
            musicEnabled={musicEnabled}
            onToggle={handleMusicToggle}
          />
        </div>
      </section>

      <section className="mobile-topbar mobile-only">
        <div className="mobile-brand">
          <div>
            <p className="eyebrow">Grid Forge</p>
            <h1>10x10 Run</h1>
          </div>
          <MusicToggle
            mode="mobile"
            musicEnabled={musicEnabled}
            onToggle={handleMusicToggle}
          />
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
            <span>Lines</span>
            <strong>{game.totalLinesCleared}</strong>
          </div>
        </div>
      </section>

      <section className="game-grid">
        <GameBoard
          game={game}
          benchmark={benchmark}
          fillRatio={fillRatio}
          isDraggingPiece={isDraggingPiece}
          mobilePlacementCopy={mobilePlacementCopy}
          preview={preview}
          resolvedHoverOrigin={resolvedHoverOrigin}
          previewBounds={previewBounds}
          selectedPiece={selectedPiece}
          clearAnimation={clearAnimation}
          boardRef={boardRef}
          gameOverHeadline={gameOverHeadline}
          gameOverCopy={gameOverCopy}
          onHoverCell={setHoveredCell}
          onBoardClick={handleBoardClick}
          onStartNewGame={startNewGame}
        />

        <aside className="sidebar desktop-only">
          <RackPanel
            mode="desktop"
            rack={game.rack}
            board={game.board}
            isCoarsePointer={isCoarsePointer}
            selectedRackIndex={selectedRackIndex}
            dragRackIndex={dragState?.rackIndex ?? null}
            onRackCardClick={handleRackCardClick}
            onRackPointerDown={handleRackPointerDown}
            onRackPointerMove={handleRackPointerMove}
            onRackPointerUp={finishPointerInteraction}
            onRackPointerCancel={cancelPointerInteraction}
          />
          <RunPanel mode="desktop" game={game} benchmark={benchmark} bestRun={bestRun} />
        </aside>
      </section>

      <section className="mobile-stack mobile-only">
        <RackPanel
          mode="mobile"
          rack={game.rack}
          board={game.board}
          isCoarsePointer={isCoarsePointer}
          selectedRackIndex={selectedRackIndex}
          dragRackIndex={dragState?.rackIndex ?? null}
          onRackCardClick={handleRackCardClick}
          onRackPointerDown={handleRackPointerDown}
          onRackPointerMove={handleRackPointerMove}
          onRackPointerUp={finishPointerInteraction}
          onRackPointerCancel={cancelPointerInteraction}
        />
        <RunPanel mode="mobile" game={game} benchmark={benchmark} bestRun={bestRun} />
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
            <PiecePreview piece={selectedPiece} className="drag-piece-grid desktop-drag-piece-grid" />
          )}
        </div>
      ) : null}
    </main>
  )
}

export default App
