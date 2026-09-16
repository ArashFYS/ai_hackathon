import type { Certainty } from '../api'
import { certaintyLabel } from '../api'
import { useLang, useT } from '../i18n'

const STYLES: Record<Certainty, string> = {
  hoog: 'bg-gray-800 text-white border-gray-800',
  middel: 'bg-white text-gray-800 border-gray-500',
  laag: 'bg-white text-gray-500 border-dashed border-gray-400',
}

/** The label is derived from the code in the UI language; `label` (backend Dutch) is only a fallback for unknown codes. */
export default function ZekerheidBadge({ certainty, label }: { certainty: Certainty; label?: string }) {
  const { lang } = useLang()
  const t = useT()
  const cls = STYLES[certainty] ?? STYLES.laag
  const text = certainty in STYLES ? certaintyLabel(lang, certainty) : (label ?? certainty)
  return (
    <span data-certainty={certainty in STYLES ? certainty : 'laag'} className={`certainty-label inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${cls}`} title={t('certainty.title')}>
      {text}
    </span>
  )
}
