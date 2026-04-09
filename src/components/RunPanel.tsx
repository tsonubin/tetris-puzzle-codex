import { type BenchmarkSummary, type BestRun, type GameState } from '../game'
import { formatDate } from '../app/session'

type RunPanelProps = {
  mode: 'desktop' | 'mobile'
  game: GameState
  benchmark: BenchmarkSummary
  bestRun: BestRun | null
}

export function RunPanel({ mode, game, benchmark, bestRun }: RunPanelProps) {
  const efficiencyLabel =
    game.totalPlacedCells === 0
      ? '0%'
      : `${Math.round((game.totalClearedCells / game.totalPlacedCells) * 100)}%`

  return (
    <section className={`sidebar-card ${mode}-only`}>
      <div className="card-header">
        <p className="card-label">Run</p>
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
          <span>Lines</span>
          <strong>{game.totalLinesCleared}</strong>
        </div>
        <div className="metric-card">
          <span>Rounds</span>
          <strong>{game.roundsCompleted}</strong>
        </div>
        <div className="metric-card">
          <span>Combo</span>
          <strong>{game.maxCombo}</strong>
        </div>
        <div className="metric-card">
          <span>Efficiency</span>
          <strong>{efficiencyLabel}</strong>
        </div>
      </div>

      {bestRun ? (
        <div className={`record-grid ${mode === 'mobile' ? 'mobile-record-grid' : ''}`}>
          <div className="record-item">
            <span>Best rank</span>
            <strong>
              {bestRun.benchmarkRank} / {bestRun.benchmarkScore}
            </strong>
          </div>
          <div className="record-item">
            <span>Best score</span>
            <strong>{bestRun.score}</strong>
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
}
