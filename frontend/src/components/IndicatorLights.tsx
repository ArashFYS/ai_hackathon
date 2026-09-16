import type { Indicator, IndicatorLevel, Indicators } from '../api'
import type { TKey } from '../i18n'
import { useT } from '../i18n'

const DOT: Record<IndicatorLevel, string> = {
  groen: 'bg-green-500',
  geel: 'bg-amber-400',
  rood: 'bg-red-500',
  onbekend: 'bg-gray-300',
}

const KEYS: { key: keyof Indicators; short: TKey; long: TKey }[] = [
  { key: 'kbo', short: 'indicators.kbo.short', long: 'indicators.kbo.long' },
  { key: 'google_maps', short: 'indicators.maps.short', long: 'indicators.maps.long' },
  { key: 'einvoice', short: 'indicators.einvoice.short', long: 'indicators.einvoice.long' },
]

function Dot({ ind, size = 'h-3 w-3' }: { ind: Indicator; size?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${size} ${DOT[ind.level] ?? DOT.onbekend}`} aria-hidden="true" />
}

/** Three traffic lights per record (KBO / Google Maps / e-facturatie).
 *  Compact = a row of dots for tables; detailed = one line per source.
 *  `label` / `text` come from the backend in Dutch (like reason sentences); the captions are translated here. */
export default function IndicatorLights({ indicators, detailed = false }: { indicators?: Indicators; detailed?: boolean }) {
  const t = useT()
  const unknown: Indicator = { level: 'onbekend', label: t('indicators.unknownLabel'), text: t('indicators.unknownText'), checked_at: null, url: null }
  const get = (k: keyof Indicators): Indicator => indicators?.[k] ?? unknown

  if (!detailed) {
    return (
      <span className="indicator-lights inline-flex items-center gap-2 whitespace-nowrap">
        {KEYS.map(({ key, short }) => {
          const ind = get(key)
          return (
            <span key={key} className="inline-flex items-center gap-1 text-xs text-gray-600" title={`${t(short)}: ${ind.label} — ${ind.text}`}>
              <Dot ind={ind} />
              {t(short)}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <ul className="indicator-lights space-y-1.5 text-sm">
      {KEYS.map(({ key, long }) => {
        const ind = get(key)
        return (
          <li key={key} className="flex items-start gap-2">
            <Dot ind={ind} size="mt-1 h-3.5 w-3.5" />
            <div>
              <span className="font-medium text-gray-800">{t(long)}:</span> <span className="text-gray-800">{ind.label}</span>
              <span className="text-gray-600"> — {ind.text}</span>
              <div className="text-xs text-gray-500">
                {ind.checked_at ? t('indicators.checkedAt', { date: ind.checked_at }) : t('indicators.notChecked')}
                {ind.url && (
                  <>
                    {' · '}
                    <a href={ind.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">{t('indicators.checkSource')}</a>
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
