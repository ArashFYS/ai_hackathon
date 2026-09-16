import type { Lang } from '../i18n'
import { useLang, useT } from '../i18n'

const LANGS: Lang[] = ['nl', 'en']

/** NL | EN switch in the header. Dutch is the default (officer-facing); English is for the jury/video. */
export default function LanguageToggle() {
  const { lang, setLang } = useLang()
  const t = useT()
  return (
    <div role="group" aria-label={t('lang.switch')} className="inline-flex overflow-hidden rounded border text-xs">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 font-medium ${lang === l ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
        >
          {t(l === 'nl' ? 'lang.nl' : 'lang.en')}
        </button>
      ))}
    </div>
  )
}
