import { type BenchmarkSummary, type BestRun, type GameState } from '../game'
import { formatDate } from '../app/session'
import { type AppMessages, type SupportedLocale } from '../i18n'

type RunPanelProps = {
  mode: 'desktop' | 'mobile'
  game: GameState
  benchmark: BenchmarkSummary
  bestRun: BestRun | null
  copy: AppMessages['run']
  locale: SupportedLocale
}

export function RunPanel({ mode, game, benchmark, bestRun, copy, locale }: RunPanelProps) {
  const efficiencyLabel =
    game.totalPlacedCells === 0
      ? '0%'
      : `${Math.round((game.totalClearedCells / game.totalPlacedCells) * 100)}%`

  return (
    <section className={`sidebar-card ${mode}-only`}>
      <div className="card-header">
        <p className="card-label">{copy.label}</p>
        <div className="hud-rank">
          <span>{benchmark.rank}</span>
          <strong>{benchmark.overall}</strong>
        </div>
      </div>

      <div className="run-summary">
        <div className="summary-block">
          <span className="summary-label">{copy.benchmark}</span>
          <strong>{benchmark.label}</strong>
        </div>
        <div className="summary-block">
          <span className="summary-label">{copy.status}</span>
          <strong>{game.gameOver ? copy.failed : copy.live}</strong>
        </div>
      </div>

      <div className={`metric-grid ${mode === 'mobile' ? 'mobile-metric-grid' : ''}`}>
        <div className="metric-card">
          <span>{copy.lines}</span>
          <strong>{game.totalLinesCleared}</strong>
        </div>
        <div className="metric-card">
          <span>{copy.rounds}</span>
          <strong>{game.roundsCompleted}</strong>
        </div>
        <div className="metric-card">
          <span>{copy.combo}</span>
          <strong>{game.maxCombo}</strong>
        </div>
        <div className="metric-card">
          <span>{copy.efficiency}</span>
          <strong>{efficiencyLabel}</strong>
        </div>
      </div>

      {bestRun ? (
        <div className={`record-grid ${mode === 'mobile' ? 'mobile-record-grid' : ''}`}>
          <div className="record-item">
            <span>{copy.bestRank}</span>
            <strong>
              {bestRun.benchmarkRank} / {bestRun.benchmarkScore}
            </strong>
          </div>
          <div className="record-item">
            <span>{copy.bestScore}</span>
            <strong>{bestRun.score}</strong>
          </div>
          <div className="record-item">
            <span>{copy.bestCombo}</span>
            <strong>{bestRun.maxCombo}</strong>
          </div>
          <p className="record-date">{formatDate(bestRun.playedAt, locale)}</p>
        </div>
      ) : (
        <p className="empty-copy">{copy.emptyRecord}</p>
      )}
    </section>
  )
}
