import type { Certainty, Conclusion, ContactStatus, ProposalKind, ProposalStatus, RecordType, Status } from './api'
import type { Lang, TKey } from './i18n'
import { translate } from './i18n'
import { nl } from './i18n/nl'

// Language-aware label helpers for backend enum codes. All text lives in src/i18n/{nl,en}; these
// functions only pick the key and fall back to the raw code when the dictionary has no entry.

export const STATUS_CODES: Status[] = ['actief', 'ter_controle', 'waarschijnlijk_niet_actief', 'geen_onderneming']

function lookup(lang: Lang, prefix: string, code: string | null | undefined, fallback?: string): string {
  if (code === null || code === undefined || code === '') return fallback ?? '—'
  const key = `${prefix}.${code}`
  return key in nl ? translate(lang, key as TKey) : (fallback ?? code)
}

export const statusLabel = (lang: Lang, code: Status | string): string => lookup(lang, 'status', code)
export const certaintyLabel = (lang: Lang, code: Certainty | string): string => lookup(lang, 'certainty', code)
export const conclusionLabel = (lang: Lang, code: Conclusion | string): string => lookup(lang, 'conclusion', code)
export const proposalStatusLabel = (lang: Lang, code: ProposalStatus | string): string => lookup(lang, 'proposalStatus', code)
export const sourceLabel = (lang: Lang, code: string | null | undefined): string => lookup(lang, 'source', code)
export const contactStatusLabel = (lang: Lang, code: ContactStatus | string): string => lookup(lang, 'contactStatus', code, '—')
export const contactTextLabel = (lang: Lang, code: ContactStatus | string): string => lookup(lang, 'contactText', code)
export const recordTypeLabel = (lang: Lang, code: RecordType | string): string => lookup(lang, 'recordType', code)
export const kindLabel = (lang: Lang, code: ProposalKind | string): string => lookup(lang, 'kind', code)
export const weightLabel = (lang: Lang, code: string): string => lookup(lang, 'weight', code)
export const directionLabel = (lang: Lang, code: string): string => lookup(lang, 'direction', code)

/** Sector label: NL uses the backend label as delivered; EN maps the sector key client-side, else the backend label. */
export function activitySectorLabel(lang: Lang, sector: string | null | undefined, backendLabel: string | null | undefined): string {
  if (lang === 'nl') return backendLabel ?? lookup(lang, 'sector', sector, '—')
  return lookup(lang, 'sector', sector, backendLabel ?? '—')
}

/** Activity source: "KBO (RSZ)" / "KBO (BTW)" stay as delivered; "waarneming" is translated. */
export function activitySourceLabel(lang: Lang, source: string | null | undefined): string | null {
  if (!source) return null
  return source === 'waarneming' ? translate(lang, 'activitySource.waarneming') : source
}

/** Backend register_label ("Actief" / "Niet actief" / "—") mapped to the UI language. */
export function registerLabel(lang: Lang, v: string | null | undefined): string {
  if (v === 'Actief') return translate(lang, 'register.actief')
  if (v === 'Niet actief') return translate(lang, 'register.niet_actief')
  return dash(v)
}

/** Display helper: null/empty → "—". */
export function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

/** Display helper: null/empty → "onbekend" / "unknown". */
export function onbekend(lang: Lang, v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return translate(lang, 'common.unknown')
  return v
}

/** Proposal values may be raw status codes; show the label when they are. */
export function valueLabel(lang: Lang, v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return lookup(lang, 'status', v, v)
}

/** Backend proposal texts are a fixed Dutch set (backend/app/scoring.py); map them in EN, pass anything else through. */
const PROPOSAL_TEXT_EN: Record<string, string> = {
  'Markeer als niet actief': 'Mark as not active',
  'Uitsluiten uit overzicht (geen onderneming)': 'Exclude from overview (not a business)',
  'Ter controle: geen bewijs van activiteit': 'To check: no evidence of activity',
  'Ter controle: register en waarneming spreken elkaar tegen': 'To check: register and observation contradict each other',
  'Ter controle: waarneming onduidelijk, opnieuw nakijken': 'To check: observation unclear, re-check',
  'Geen actie': 'No action',
}
export function proposalTextLabel(lang: Lang, text: string | null | undefined): string {
  if (!text) return '—'
  if (lang !== 'en') return text
  const [head, ...rest] = text.split('; ')
  const tail = rest.map((p) => (p === 'adres nazien' ? 'check address' : p))
  return [PROPOSAL_TEXT_EN[head] ?? head, ...tail].join('; ')
}
