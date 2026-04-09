import { type CSSProperties, type RefObject } from 'react'
import {
  BOARD_SIZE,
  type BenchmarkSummary,
  type Coordinate,
  type GameState,
  type RackPiece,
} from '../game'
import { formatPercent } from '../app/session'

type ClearAnimationState = {
  pulse: number
  keys: Set<string>
  rows: number[]
  columns: number[]
}

type PreviewState = {
  cells: Map<string, string>
  valid: boolean
}

type PreviewBounds = {
  x: number
  y: number
  width: number
  height: number
}

type MobilePlacementCopy = {
  title: string
  detail: string
}

type GameBoardProps = {
  game: GameState
  benchmark: BenchmarkSummary
  fillRatio: number
  isDraggingPiece: boolean
  mobilePlacementCopy: MobilePlacementCopy | null
  preview: PreviewState | null
  resolvedHoverOrigin: Coordinate | null
  previewBounds: PreviewBounds | null
  selectedPiece: RackPiece | null
  clearAnimation: ClearAnimationState | null
  boardRef: RefObject<HTMLDivElement | null>
  gameOverHeadline: string
  gameOverCopy: string
  onHoverCell: (cell: Coordinate) => void
  onBoardClick: (x: number, y: number) => void
  onStartNewGame: () => void
}

export function GameBoard({
  game,
  benchmark,
  fillRatio,
  isDraggingPiece,
  mobilePlacementCopy,
  preview,
  resolvedHoverOrigin,
  previewBounds,
  selectedPiece,
  clearAnimation,
  boardRef,
  gameOverHeadline,
  gameOverCopy,
  onHoverCell,
  onBoardClick,
  onStartNewGame,
}: GameBoardProps) {
  return (
    <div className="board-card">
      <div className="card-header">
        <div>
          <p className="card-label">Board</p>
          <h2>Placement Arena</h2>
        </div>
        <p className="card-note">
          Clear full rows or columns. Occupancy: <strong>{formatPercent(fillRatio)}</strong>
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
                  onMouseEnter={() => onHoverCell({ x, y })}
                  onFocus={() => onHoverCell({ x, y })}
                  onClick={() => onBoardClick(x, y)}
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
              onClick={onStartNewGame}
            >
              Run it back
            </button>
          </div>
        ) : null}
      </div>

      <div className="notice-row">
        <p className={`notice-pill ${game.gameOver ? 'failed' : ''}`}>{game.notice}</p>
        <button type="button" className="reset-button" onClick={onStartNewGame}>
          New run
        </button>
      </div>
    </div>
  )
}
