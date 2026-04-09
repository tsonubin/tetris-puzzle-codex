import { type CSSProperties, type RefObject } from 'react'
import {
  BOARD_SIZE,
  type BenchmarkSummary,
  type Coordinate,
  type GameState,
  type RackPiece,
} from '../game'
import { formatPercent } from '../app/session'
import { type AppMessages } from '../i18n'

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
  copy: AppMessages['board']
  metricsCopy: AppMessages['metrics']
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
  copy,
  metricsCopy,
  onHoverCell,
  onBoardClick,
  onStartNewGame,
}: GameBoardProps) {
  return (
    <div className="board-card">
      <div className="card-header">
        <div>
          <p className="card-label">{copy.label}</p>
          <h2>{copy.title}</h2>
        </div>
        <p className="card-note">
          {copy.clearHint} {copy.occupancy}: <strong>{formatPercent(fillRatio)}</strong>
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
                  aria-label={copy.boardCellAria(x + 1, y + 1)}
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
                <span>{preview?.valid ? copy.drop : copy.blocked}</span>
              </div>
            </>
          ) : null}
        </div>

        {game.gameOver ? (
          <div className="gameover-overlay">
            <p className="eyebrow">{copy.runOver}</p>
            <h3>{gameOverHeadline}</h3>
            <p className="gameover-copy">{gameOverCopy}</p>

            <div className="gameover-metrics">
              <div className="gameover-metric">
                <span>{copy.score}</span>
                <strong>{game.score}</strong>
              </div>
              <div className="gameover-metric">
                <span>{copy.rank}</span>
                <strong>
                  {benchmark.rank} / {benchmark.overall}
                </strong>
              </div>
              <div className="gameover-metric">
                <span>{metricsCopy.lines}</span>
                <strong>{game.totalLinesCleared}</strong>
              </div>
              <div className="gameover-metric">
                <span>{copy.rounds}</span>
                <strong>{game.roundsCompleted}</strong>
              </div>
            </div>

            <button
              type="button"
              className="gameover-button"
              onClick={onStartNewGame}
            >
              {copy.runItBack}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
