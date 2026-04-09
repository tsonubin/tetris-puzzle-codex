import { type PointerEvent as ReactPointerEvent } from 'react'
import { hasAnyRackFit, isRackEmpty, RACK_SIZE, type Board, type RackPiece } from '../game'
import { PiecePreview } from './PiecePreview'
import { type AppMessages } from '../i18n'

type RackPanelProps = {
  mode: 'desktop' | 'mobile'
  rack: Array<RackPiece | null>
  board: Board
  isCoarsePointer: boolean
  selectedRackIndex: number | null
  dragRackIndex: number | null
  copy: AppMessages['rack']
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
  copy,
  onRackCardClick,
  onRackPointerDown,
  onRackPointerMove,
  onRackPointerUp,
  onRackPointerCancel,
}: RackPanelProps) {
  const remainingPieces = rack.filter(Boolean).length

  return (
    <section
      className={`sidebar-card rack-panel ${mode}-only ${mode === 'mobile' ? 'mobile-draft-dock' : ''} ${mode === 'mobile' && dragRackIndex !== null ? 'mobile-draft-dock--dragging' : ''}`}
    >
      <div className="card-header">
        <div>
          <p className="card-label">{copy.label}</p>
          <h2>{mode === 'mobile' ? copy.mobileTitle : copy.desktopTitle}</h2>
        </div>
        <p className="card-note">
          {isRackEmpty(rack)
            ? copy.freshPieces
            : copy.piecesRemaining(remainingPieces, RACK_SIZE)}
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
                        {piece.mass} {copy.cells} / {piece.width}x{piece.height}
                      </p>
                    </div>
                    <span className={`fit-badge ${isPlayable ? 'playable' : 'blocked'}`}>
                      {isPlayable ? copy.fits : copy.blocked}
                    </span>
                  </div>
                  <PiecePreview piece={piece} />
                </>
              ) : (
                <div className="rack-empty">
                  <span>{copy.placed}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className={`interaction-copy ${mode === 'mobile' ? 'mobile-interaction-copy' : ''}`}>
        {isCoarsePointer ? copy.coarseHint : copy.fineHint}
      </p>
    </section>
  )
}
