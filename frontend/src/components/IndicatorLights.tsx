import type { Indicator, IndicatorLevel, Indicators } from '../api'

const DOT: Record<IndicatorLevel, string> = {
  groen: 'bg-green-500',
  geel: 'bg-amber-400',
  rood: 'bg-red-500',
  onbekend: 'bg-gray-300',
}

const KEYS: { key: keyof Indicators; short: string; long: string }[] = [
  { key: 'kbo', short: 'KBO', long: 'KBO-register' },
  { key: 'google_maps', short: 'Maps', long: 'Google Maps' },
  { key: 'einvoice', short: 'e-fact.', long: 'E-facturatie (Peppol)' },
]

const UNKNOWN: Indicator = { level: 'onbekend', label: 'Onbekend', text: 'Nog niet gecontroleerd', checked_at: null, url: null }

function Dot({ ind, size = 'h-3 w-3' }: { ind: Indicator; size?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${size} ${DOT[ind.level] ?? DOT.onbekend}`} aria-hidden="true" />
}

/** Three traffic lights per record. Compact = a row of dots for tables; detailed = one line per source. */
export default function IndicatorLights({ indicators, detailed = false }: { indicators?: Indicators; detailed?: boolean }) {
  const get = (k: keyof Indicators): Indicator => indicators?.[k] ?? UNKNOWN

  if (!detailed) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        {KEYS.map(({ key, short }) => {
          const ind = get(key)
          return (
            <span key={key} className="inline-flex items-center gap-1 text-xs text-gray-600" title={`${short}: ${ind.label} — ${ind.text}`}>
              <Dot ind={ind} />
              {short}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {KEYS.map(({ key, long }) => {
        const ind = get(key)
        return (
          <li key={key} className="flex items-start gap-2">
            <Dot ind={ind} size="mt-1 h-3.5 w-3.5" />
            <div>
              <span className="font-medium text-gray-800">{long}:</span> <span className="text-gray-800">{ind.label}</span>
              <span className="text-gray-600"> — {ind.text}</span>
              <div className="text-xs text-gray-500">
                {ind.checked_at ? `gecontroleerd ${ind.checked_at}` : 'nog niet gecontroleerd'}
                {ind.url && (
                  <>
                    {' · '}
                    <a href={ind.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Controleer bron ↗</a>
                  </>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
