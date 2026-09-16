import type { Status } from '../api'
import { statusLabel } from '../api'
import { useLang } from '../i18n'

const KNOWN: ReadonlySet<string> = new Set<Status>([
  'actief',
  'ter_controle',
  'waarschijnlijk_niet_actief',
  'geen_onderneming',
])

/** The label is derived from the code in the UI language; `label` (backend Dutch) is only a fallback for unknown codes. */
export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const { lang } = useLang()
  const text = KNOWN.has(status) ? statusLabel(lang, status) : (label ?? status)
  return (
    <span data-status={KNOWN.has(status) ? status : 'geen_onderneming'} className="activity-status">
      {text}
    </span>
  )
}
