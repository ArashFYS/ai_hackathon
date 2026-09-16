import { useEffect, useState } from 'react'
import { useT } from '../i18n'

const STATUS_KEYS = {
  OPERATIONAL: 'places.status.OPERATIONAL',
  CLOSED_TEMPORARILY: 'places.status.CLOSED_TEMPORARILY',
  CLOSED_PERMANENTLY: 'places.status.CLOSED_PERMANENTLY',
} as const

/** Browser-side Places API (New) Text Search: phone, website, hours, status for the record's name + address (TICKET-038).
 *  The key is referrer-restricted to this origin; the officer judges whether the listing matches and logs it as evidence. */
interface Place {
  displayName?: { text: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: { weekdayDescriptions: string[] }
  rating?: number
  userRatingCount?: number
  businessStatus?: string
  googleMapsUri?: string
}

const FIELDS = [
  'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber', 'places.websiteUri',
  'places.regularOpeningHours.weekdayDescriptions', 'places.rating', 'places.userRatingCount',
  'places.businessStatus', 'places.googleMapsUri',
].join(',')

async function searchText(key: string, query: string): Promise<Place | null> {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({ textQuery: query, languageCode: 'nl', regionCode: 'BE', pageSize: 1 }),
  })
  if (!r.ok) throw new Error(String(r.status))
  const data = (await r.json()) as { places?: Place[] }
  return data.places?.[0] ?? null
}

export default function GooglePlacesPanel({ apiKey, query }: { apiKey: string; query: string }) {
  const t = useT()
  const [place, setPlace] = useState<Place | null | undefined>(undefined) // undefined = not fetched yet
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [fetchedAt, setFetchedAt] = useState('')

  useEffect(() => {
    setPlace(undefined)
    setError(false)
  }, [query])

  const fetchNow = () => {
    setLoading(true)
    setError(false)
    searchText(apiKey, query)
      .then((p) => {
        setPlace(p)
        setFetchedAt(new Date().toISOString().slice(0, 10))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const button = (
    <button
      type="button"
      onClick={fetchNow}
      disabled={loading}
      className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {loading ? t('places.fetching') : t('places.fetch')}
    </button>
  )

  const row = (label: string, value: React.ReactNode) =>
    value ? (
      <div className="flex gap-3">
        <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
        <dd className="min-w-0 flex-1 text-gray-900">{value}</dd>
      </div>
    ) : null

  return (
    <div className="space-y-2 border-b p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        {button}
        <span className="text-gray-500">{t('places.query')} <span className="text-gray-700">{query}</span></span>
      </div>
      {error && <p className="text-red-700">{t('places.error')}</p>}
      {place === null && <p className="text-gray-700">{t('places.none')}</p>}
      {place && (
        <div className="space-y-2 rounded border border-green-300 bg-green-50 p-3">
          <p className="font-medium text-gray-900">
            {t('places.match')} {place.displayName?.text}
            {place.formattedAddress && <span className="font-normal text-gray-600"> · {place.formattedAddress}</span>}
          </p>
          <dl className="space-y-1">
            {row(t('places.phone'), place.nationalPhoneNumber && <a href={`tel:${place.nationalPhoneNumber}`} className="font-medium text-blue-700 underline">{place.nationalPhoneNumber}</a>)}
            {row(t('places.website'), place.websiteUri && <a href={place.websiteUri} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{place.websiteUri}</a>)}
            {row(t('places.status'), place.businessStatus && (place.businessStatus in STATUS_KEYS ? t(STATUS_KEYS[place.businessStatus as keyof typeof STATUS_KEYS]) : place.businessStatus))}
            {row(t('places.rating'), place.rating !== undefined && `${place.rating} ★ (${place.userRatingCount ?? 0})`)}
            {row(t('places.hours'), place.regularOpeningHours && (
              <ul>{place.regularOpeningHours.weekdayDescriptions.map((d) => <li key={d}>{d}</li>)}</ul>
            ))}
          </dl>
          <p className="text-xs text-gray-600">
            {t('places.source', { date: fetchedAt })}{' '}
            {place.googleMapsUri && <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t('places.open')}</a>}
          </p>
        </div>
      )}
    </div>
  )
}
