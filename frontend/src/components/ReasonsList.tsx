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
    <ul className="assessment-reasons">
      {reasons.map((r, i) => {
        const d = DIR[r.direction] ?? DIR.neutraal
        return (
          <li key={`${r.code}-${i}`} className="reason-entry">
            <span className={`reason-direction ${d.cls}`} title={directionLabel(lang, r.direction)}>
              {d.sign}
            </span>
            <span className="reason-copy">
              <span className="reason-heading">
                <span className="text-gray-800">{r.text}</span>
                <span className="reason-weight">{weightLabel(lang, r.weight)}</span>
              </span>
              {(r.source || r.observed_at || r.url) && (
                <span className="reason-reference">
                  {r.source && <span>{t('reasons.source')} {r.source}</span>}
                  {r.field && <span>{t('reasons.field')} <code>{r.field}</code></span>}
                  {r.observed_at && <span>{r.observed_at}</span>}
                  {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        {t('reasons.verify')}
                      </a>
                  )}
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
