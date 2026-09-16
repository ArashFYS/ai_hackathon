import type { Reason } from '../api'
import { directionLabel, weightLabel } from '../api'
import { useLang, useT } from '../i18n'

const DIR: Record<Reason['direction'], { sign: string; cls: string }> = {
  positief: { sign: '+', cls: 'bg-green-100 text-green-800' },
  negatief: { sign: '−', cls: 'bg-red-100 text-red-800' },
  neutraal: { sign: '·', cls: 'bg-gray-100 text-gray-600' },
}

/** Reason sentences (`r.text`) and `r.source` are backend free text: shown as delivered (Dutch). */
export default function ReasonsList({ reasons }: { reasons: Reason[] }) {
  const t = useT()
  const { lang } = useLang()
  if (!reasons || reasons.length === 0) {
    return <p className="text-sm text-gray-500">{t('reasons.none')}</p>
  }
  return (
    <ul className="space-y-1.5">
      {reasons.map((r, i) => {
        const d = DIR[r.direction] ?? DIR.neutraal
        return (
          <li key={`${r.code}-${i}`} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${d.cls}`} title={directionLabel(lang, r.direction)}>
              {d.sign}
            </span>
            <span className="flex-1">
              <span className="text-gray-800">{r.text}</span>
              {(r.source || r.observed_at || r.url) && (
                <span className="mt-0.5 block text-xs text-gray-500">
                  {r.source && <>{t('reasons.source')} {r.source}</>}
                  {r.field && <> · {t('reasons.field')} <code className="rounded bg-gray-100 px-1">{r.field}</code></>}
                  {r.observed_at && <> · {r.observed_at}</>}
                  {r.url && (
                    <>
                      {' · '}
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        {t('reasons.verify')}
                      </a>
                    </>
                  )}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-gray-500">{weightLabel(lang, r.weight)}</span>
          </li>
        )
      })}
    </ul>
  )
}
