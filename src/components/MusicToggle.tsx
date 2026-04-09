type MusicToggleProps = {
  mode: 'desktop' | 'mobile'
  musicEnabled: boolean
  onToggle: () => void
}

export function MusicToggle({
  mode,
  musicEnabled,
  onToggle,
}: MusicToggleProps) {
  return (
    <button
      type="button"
      className={`music-toggle ${mode === 'mobile' ? 'mobile-music-toggle' : ''}`}
      aria-pressed={musicEnabled}
      aria-label={musicEnabled ? 'Mute background music' : 'Enable background music'}
      onClick={onToggle}
    >
      <span className="music-toggle-label">BGM</span>
      <strong>{musicEnabled ? 'On' : 'Off'}</strong>
    </button>
  )
}
