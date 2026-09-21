import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import { useLanguage } from '../../store/hooks/useLanguage'
import { LANGUAGES } from '../../i18n/languages'
import type { LanguageSelectorProps } from '../../types/common/languageType'

// Sorteres på sprogets eget navn, så listen læser rigtigt for den der
// leder efter sit eget sprog - ikke på ISO-koden, som ingen kender.
const SORTED_LANGUAGES = [...LANGUAGES].sort((a, b) =>
  a.nativeName.localeCompare(b.nativeName),
)

export function LanguageSelector({ variant = 'dropdown', className = '' }: LanguageSelectorProps) {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Samme luk-adfærd som bruger-dropdownen i headerComponent.tsx:
  // klik udenfor eller Escape lukker panelet.
  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // Søgningen matcher både det lokale og det engelske navn, så man kan
  // finde "Tysk" ved at skrive enten "Deutsch" eller "German".
  const visibleLanguages = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return SORTED_LANGUAGES
    return SORTED_LANGUAGES.filter(
      (l) =>
        l.nativeName.toLowerCase().includes(needle) ||
        l.englishName.toLowerCase().includes(needle),
    )
  }, [query])

  function choose(code: string) {
    setLanguage(code)
    setOpen(false)
    setQuery('')
  }

  // Profilsidens variant: almindelig <select> med husets standardklasser.
  if (variant === 'select') {
    return (
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label={t('language.choose')}
        className={`rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
      >
        {SORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    )
  }

  // Headerens variant: ikonknap + panel med søgefelt.
  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.choose')}
        className="flex items-center gap-1.5 p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
      >
        <Globe className="w-5 h-5 shrink-0" />
        <span className="text-xs font-semibold uppercase">{language}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('language.label')}
          className="absolute right-0 mt-2 w-64 rounded-md bg-white dark:bg-slate-800 shadow-lg border border-border-gray dark:border-slate-700 py-1 z-50"
        >
          <div className="px-2 py-1.5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('language.search')}
              autoFocus
              className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {visibleLanguages.length === 0 ? (
              <p className="px-3 py-2 text-sm text-secondary dark:text-slate-400">
                {t('language.noResults')}
              </p>
            ) : (
              visibleLanguages.map((l) => {
                const isActive = l.code === language
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(l.code)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-primary dark:text-slate-100 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{l.nativeName}</span>
                      <span className="block truncate text-xs text-secondary dark:text-slate-400">
                        {l.englishName}
                      </span>
                    </span>
                    {isActive && <Check className="w-4 h-4 shrink-0 text-accent" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
