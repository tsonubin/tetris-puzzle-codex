import { type AppMessages } from '../i18n'

type MusicToggleProps = {
  mode: 'desktop' | 'mobile'
  musicEnabled: boolean
  copy: AppMessages['audio']
  onToggle: () => void
}

export function MusicToggle({
  mode,
  musicEnabled,
  copy,
  onToggle,
}: MusicToggleProps) {
  return (
    <button
      type="button"
      className={`music-toggle ${mode === 'mobile' ? 'mobile-music-toggle' : ''}`}
      aria-pressed={musicEnabled}
      aria-label={musicEnabled ? copy.muteAria : copy.enableAria}
      onClick={onToggle}
    >
      <span className="music-toggle-label">{copy.bgm}</span>
      <strong>{musicEnabled ? copy.on : copy.off}</strong>
    </button>
  )
}
