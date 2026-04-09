import { type ChangeEvent } from 'react'
import { type AppMessages, type LanguageSetting } from '../i18n'

type LanguageSwitcherProps = {
  mode: 'desktop' | 'mobile'
  value: LanguageSetting
  copy: AppMessages['language']
  onChange: (value: LanguageSetting) => void
}

export function LanguageSwitcher({ mode, value, copy, onChange }: LanguageSwitcherProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as LanguageSetting)
  }

  return (
    <label className={`language-switcher ${mode === 'mobile' ? 'mobile-language-switcher' : ''}`}>
      <span className="language-switcher-label">{copy.label}</span>
      <select value={value} onChange={handleChange} aria-label={copy.label}>
        <option value="system">{copy.system}</option>
        <option value="en">{copy.english}</option>
        <option value="zh-CN">{copy.chineseSimplified}</option>
        <option value="zh-TW">{copy.chineseTraditional}</option>
        <option value="ja">{copy.japanese}</option>
      </select>
    </label>
  )
}
