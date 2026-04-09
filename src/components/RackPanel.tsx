import { type PointerEvent as ReactPointerEvent } from 'react'
import { hasAnyRackFit, isRackEmpty, RACK_SIZE, type Board, type RackPiece } from '../game'
import { PiecePreview } from './PiecePreview'

type RackPanelProps = {
  mode: 'desktop' | 'mobile'
  rack: Array<RackPiece | null>
  board: Board
  isCoarsePointer: boolean
  selectedRackIndex: number | null
  dragRackIndex: number | null
  onRackCardClick: (index: number) => void
  onRackPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void
  onRackPointerMove: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void
  onRackPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void
  onRackPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>, index: number) => void
}

export function RackPanel({
  mode,
  rack,
  board,
  isCoarsePointer,
  selectedRackIndex,
  dragRackIndex,
  onRackCardClick,
  onRackPointerDown,
  onRackPointerMove,
  onRackPointerUp,
  onRackPointerCancel,
}: RackPanelProps) {
  const remainingPieces = rack.filter(Boolean).length

  return (
    <section
      className={`sidebar-card rack-panel ${mode}-only ${mode === 'mobile' ? 'mobile-draft-dock' : ''}`}
    >
      <div className="card-header">
        <div>
          <p className="card-label">Rack</p>
          <h2>{mode === 'mobile' ? 'Draft Tray' : 'Current Draft'}</h2>
        </div>
        <p className="card-note">
          {isRackEmpty(rack)
            ? 'Fresh pieces arrive after this turn resolves.'
            : `${remainingPieces}/${RACK_SIZE} pieces remaining`}
        </p>
      </div>

      <div className={`rack-grid ${mode === 'mobile' ? 'mobile-rack-grid' : ''}`}>
        {rack.map((piece, index) => {
          const isSelected = selectedRackIndex === index
          const isPlayable = piece ? hasAnyRackFit(board, [piece]) : false

          return (
            <button
              key={`${mode}-${piece?.instanceId ?? `empty-${index}`}`}
              type="button"
              draggable={false}
              className={`rack-card ${isSelected ? 'selected' : ''} ${dragRackIndex === index ? 'dragging' : ''} ${!piece ? 'spent' : ''} ${mode === 'mobile' ? 'mobile-rack-card' : ''}`}
              onClick={() => onRackCardClick(index)}
              disabled={!piece}
              onPointerDown={(event) => onRackPointerDown(event, index)}
              onPointerMove={(event) => onRackPointerMove(event, index)}
              onPointerUp={(event) => onRackPointerUp(event, index)}
              onPointerCancel={(event) => onRackPointerCancel(event, index)}
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
                  <PiecePreview piece={piece} />
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
}
