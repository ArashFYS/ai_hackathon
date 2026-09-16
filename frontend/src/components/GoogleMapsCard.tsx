import { useEffect, useState } from 'react'
import type { GoogleMapsPlace, MapsStatus } from '../api'
import { ApiError, refreshRecordGoogleMaps } from '../api'
import type { TKey } from '../i18n'
import { useLang, useT } from '../i18n'
import { mapsMatchLabel } from '../labels'

type Shown = MapsStatus | 'niet_opgehaald'

const STATUS_CLASS: Record<Shown, string> = {
  open: 'bg-green-100 text-green-800',
  tijdelijk_gesloten: 'bg-amber-100 text-amber-800',
  permanent_gesloten: 'bg-red-100 text-red-800',
  niet_gevonden: 'bg-amber-100 text-amber-800',
  niet_opgehaald: 'bg-gray-100 text-gray-600',
}

const ext = { target: '_blank', rel: 'noopener noreferrer', className: 'text-blue-700 hover:underline' } as const

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

/** Google Maps listing scraped via Apify; `place` null = never fetched. Text from the listing is shown as delivered. */
export default function GoogleMapsCard({ nr, place: initial, onChanged }: { nr: string; place: GoogleMapsPlace | null; onChanged: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const [place, setPlace] = useState<GoogleMapsPlace | null>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => setPlace(initial), [initial])

  const shown: Shown = place ? place.status : 'niet_opgehaald'
  const found = place !== null && place.status !== 'niet_gevonden'
  const nf = new Intl.NumberFormat(lang === 'nl' ? 'nl-BE' : 'en-GB', { maximumFractionDigits: 1 })

  const fetchNow = () => {
    setBusy(true)
    setMsg(null)
    refreshRecordGoogleMaps(nr)
      .then((p) => {
        setPlace(p)
        onChanged()
      })
      .catch((e: unknown) => setMsg(e instanceof ApiError && (e.status === 409 || e.status === 502) ? e.message : t('maps.fetchError')))
      .finally(() => setBusy(false))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASS[shown]}`}>{t(`maps.status.${shown}` as TKey)}</span>
        {found && place?.title && <span className="text-sm font-medium">{place.title}</span>}
        {found && place?.category && <span className="text-xs text-gray-500">{place.category}</span>}
        {place && (
          <span className={`rounded border px-1.5 py-0.5 text-xs ${place.match_quality === 'adres' ? 'border-green-300 text-green-800' : place.match_quality === 'naam' ? 'border-amber-300 text-amber-800' : 'border-gray-300 text-gray-600'}`}>
            {t('maps.match')} {mapsMatchLabel(lang, place.match_quality)}
          </span>
        )}
      </div>

      {!place && <p className="text-sm text-gray-500">{t('maps.notFetched')}</p>}
      {place && !found && <p className="text-sm text-gray-500">{t('maps.notFound', { query: place.search_string })}</p>}

      {place && found && (
        <div className="space-y-1">
          {place.address && <Row label={t('maps.address')}>{place.address}</Row>}
          {place.phone && <Row label={t('maps.phone')}><a href={`tel:${place.phone.replace(/[\s./-]/g, '')}`} className="text-blue-700 hover:underline">{place.phone}</a></Row>}
          {place.emails.length > 0 && (
            <Row label={t('maps.email')}>{place.emails.map((e, i) => <span key={e}>{i > 0 && ', '}<a href={`mailto:${e}`} className="text-blue-700 hover:underline">{e}</a></span>)}</Row>
          )}
          {place.website && <Row label={t('maps.website')}><a href={place.website} {...ext}>{place.website}</a></Row>}
          <Row label={t('maps.ratingLabel')}>
            {place.rating !== null ? t('maps.rating', { rating: nf.format(place.rating) }) : '—'} · {t('maps.reviews', { n: place.reviews_count ?? 0 })}
            {place.latest_review_at && <span className="text-gray-500"> · {t('maps.latestReview', { date: place.latest_review_at })}</span>}
          </Row>
          {place.reviews.length > 0 && (
            <div className="text-sm">
              <div className="text-gray-500">{t('maps.latestReviews')}</div>
              <ul className="mt-0.5 space-y-0.5">
                {place.reviews.map((r, i) => (
                  <li key={i} className="text-gray-800">
                    <span className="text-xs text-gray-500">{r.date ?? '—'} · {t('maps.stars', { n: r.stars ?? '—' })}</span>
                    {r.text && <span> — {r.text.length > 140 ? `${r.text.slice(0, 140)}…` : r.text}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {place.opening_hours.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500">{t('maps.hours')}</summary>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                {place.opening_hours.map((h) => (
                  <div key={h.day} className="contents"><dt className="text-gray-500">{h.day}</dt><dd>{h.hours}</dd></div>
                ))}
              </dl>
            </details>
          )}
          {place.url && <a href={place.url} {...ext} className="text-sm text-blue-700 hover:underline">{t('maps.open')}</a>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-2">
        <button
          type="button"
          onClick={fetchNow}
          disabled={busy}
          className="rounded border border-gray-800 bg-white px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
        >
          {busy ? t('maps.fetching') : place ? t('maps.refetch') : t('maps.fetch')}
        </button>
        <span className="text-xs text-gray-500">{t('maps.costHint')}</span>
        {place && <span className="text-xs text-gray-500">{t('maps.fetchedAt', { date: place.scraped_at.slice(0, 10) })}</span>}
        {msg && <span className="w-full text-xs text-red-700">{msg}</span>}
      </div>
    </div>
  )
}
