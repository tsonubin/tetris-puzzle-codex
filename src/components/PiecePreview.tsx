import { type CSSProperties } from 'react'
import { type RackPiece } from '../game'

type PiecePreviewProps = {
  piece: RackPiece
  className?: string
}

export function PiecePreview({ piece, className = '' }: PiecePreviewProps) {
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
