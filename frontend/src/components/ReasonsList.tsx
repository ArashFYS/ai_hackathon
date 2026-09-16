import type { Reason } from '../api'

const DIR: Record<Reason['direction'], { sign: string; cls: string }> = {
  positief: { sign: '+', cls: 'bg-green-100 text-green-800' },
  negatief: { sign: '−', cls: 'bg-red-100 text-red-800' },
  neutraal: { sign: '·', cls: 'bg-gray-100 text-gray-600' },
}

export default function ReasonsList({ reasons }: { reasons: Reason[] }) {
  if (!reasons || reasons.length === 0) {
    return <p className="text-sm text-gray-500">Geen redenen beschikbaar.</p>
  }
  return (
    <ul className="space-y-1.5">
      {reasons.map((r, i) => {
        const d = DIR[r.direction] ?? DIR.neutraal
        return (
          <li key={`${r.code}-${i}`} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${d.cls}`} title={r.direction}>
              {d.sign}
            </span>
            <span className="flex-1">
              <span className="text-gray-800">{r.text}</span>
              {(r.source || r.observed_at || r.url) && (
                <span className="mt-0.5 block text-xs text-gray-500">
                  {r.source && <>Bron: {r.source}</>}
                  {r.field && <> · veld <code className="rounded bg-gray-100 px-1">{r.field}</code></>}
                  {r.observed_at && <> · {r.observed_at}</>}
                  {r.url && (
                    <>
                      {' · '}
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        Controleer bron ↗
                      </a>
                    </>
                  )}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-gray-500">{r.weight}</span>
          </li>
        )
      })}
    </ul>
  )
}
