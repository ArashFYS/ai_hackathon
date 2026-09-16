import type { Status } from '../api'
import { statusLabel } from '../api'
import { useLang } from '../i18n'

const COLOURS: Record<Status, string> = {
  actief: 'bg-green-100 text-green-800 border-green-300',
  ter_controle: 'bg-amber-100 text-amber-800 border-amber-300',
  waarschijnlijk_niet_actief: 'bg-red-100 text-red-800 border-red-300',
  geen_onderneming: 'bg-gray-100 text-gray-700 border-gray-300',
}

/** The label is derived from the code in the UI language; `label` (backend Dutch) is only a fallback for unknown codes. */
export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const { lang } = useLang()
  const cls = COLOURS[status] ?? COLOURS.geen_onderneming
  const text = status in COLOURS ? statusLabel(lang, status) : (label ?? status)
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {text}
    </span>
  )
}
