import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { nl } from './nl'
import { en } from './en'

// Tiny i18n: two dictionaries with identical keys (TypeScript enforces `en` has every `nl` key).
// Dutch is the default and the officer-facing language; English is for the jury/video.
export type Lang = 'nl' | 'en'
export type TKey = keyof typeof nl
export type Vars = Record<string, string | number>

const DICTS: Record<Lang, Record<TKey, string>> = { nl, en }
const STORAGE_KEY = 'lang'

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'en' ? 'en' : 'nl'
  } catch {
    return 'nl'
  }
}

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Pure translate for code outside React (labels.ts helpers). */
export function translate(lang: Lang, key: TKey, vars?: Vars): string {
  return interpolate(DICTS[lang][key] ?? nl[key] ?? key, vars)
}

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<Ctx>({ lang: 'nl', setLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = translate(lang, 'app.title')
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* private mode: ignore */
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): Ctx {
  return useContext(LangContext)
}

export type TFn = (key: TKey, vars?: Vars) => string

/** `t('street.col.address')` or `t('street.count', { total: 3, addresses: 2 })`. */
export function useT(): TFn {
  const { lang } = useLang()
  return useCallback((key: TKey, vars?: Vars) => translate(lang, key, vars), [lang])
}
