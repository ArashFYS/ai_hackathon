import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoItem, Status } from '../api'
import { STATUS_CODES, dash, getGeo, recordTypeLabel, statusLabel } from '../api'
import { useLang, useT } from '../i18n'
import StatusBadge from '../components/StatusBadge'
import MapLocationFilters from '../components/MapLocationFilters'

const SCHOTEN_CENTER: [number, number] = [51.26416, 4.50821]
const MARKER_COLOURS: Record<Status, string> = {
  actief: '#16a34a', ter_controle: '#d97706', waarschijnlijk_niet_actief: '#dc2626', geen_onderneming: '#6b7280',
}

type MappableItem = GeoItem & { lat: number; lng: number }
function isMappable(item: GeoItem): item is MappableItem {
  return item.location_valid === true && typeof item.lat === 'number' && typeof item.lng === 'number'
    && Number.isFinite(item.lat) && Number.isFinite(item.lng)
}

/** Only reliable points affect the viewport. Rejected coordinates never become markers. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 })
    else map.setView(SCHOTEN_CENTER, 12)
  }, [map, points])
  return null
}

export default function Kaart() {
  const t = useT()
  const { lang } = useLang()
  const [params, setParams] = useSearchParams()
  const street = params.get('street') ?? ''
  const city = params.get('city') ?? ''
  const status = (params.get('status') ?? '') as Status | ''
  const [items, setItems] = useState<GeoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setItems([])
    getGeo({ street: street || undefined, city: city || undefined, status: status || undefined, limit: 2000 })
      .then((data) => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [street, city, status])

  const mapped = useMemo(() => items.filter(isMappable), [items])
  const rejected = useMemo(() => items.filter((item) => !isMappable(item)), [items])
  const points = useMemo<[number, number][]>(() => mapped.map((item) => [item.lat, item.lng]), [mapped])

  function update(next: { city?: string; street?: string; status?: string }) {
    setParams((previous) => {
      const result = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(next)) {
        if (value) result.set(key, value)
        else result.delete(key)
      }
      return result
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1>{t('map.title')}</h1>
        <p className="text-sm text-gray-600">{t('geo.positionNote')}</p>
      </div>
      <MapLocationFilters city={city} street={street} status={status} onChange={update} />
      <p className="text-sm text-gray-600" role="status">
        {loading ? t('common.loading') : error ? t('map.loadError')
          : t('geo.shownCount', { shown: mapped.length, hidden: rejected.length })}
      </p>
      {!loading && !error && !mapped.length && <p className="text-sm text-gray-600">{t('geo.noPins')}</p>}
      <div className="overflow-hidden rounded border bg-white">
        <MapContainer center={SCHOTEN_CENTER} zoom={14} className="h-[70vh] w-full" scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={t('map.attribution')} />
          <FitBounds points={points} />
          {mapped.map((item) => (
            <CircleMarker key={item.nr} center={[item.lat, item.lng]} radius={6}
              pathOptions={{ color: MARKER_COLOURS[item.status], fillColor: MARKER_COLOURS[item.status], fillOpacity: 0.7, weight: 1.5 }}>
              <Popup><div className="space-y-1 text-sm">
                <div className="font-semibold">{item.display_name}</div>
                <div className="text-xs text-gray-600">{recordTypeLabel(lang, item.record_type)} · {dash(item.address)}</div>
                <StatusBadge status={item.status} label={item.status_label} />
                <div><Link to={'/record/' + item.nr} className="text-blue-700 hover:underline">{t('map.viewDetail')}</Link></div>
              </div></Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700">
        <span>{t('map.legend')}</span>
        {STATUS_CODES.map((value) => <span key={value} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: MARKER_COLOURS[value] }} />
          {statusLabel(lang, value)}
        </span>)}
      </div>
      {!!rejected.length && <details className="coordinate-review">
        <summary>{t('geo.issueCount', { n: rejected.length })}</summary>
        <p className="mt-3 text-gray-600">{t('geo.hiddenExplanation')}</p>
        <ul>{rejected.map((item) => <li key={item.nr}>
          <Link to={'/record/' + item.nr} className="text-blue-700 underline">{item.display_name}</Link>
          <span>{dash(item.address)}</span>
          <span>{t(item.location_issue === 'outside_expected_area' ? 'geo.issue.outside_expected_area'
            : item.location_issue === 'unverified_municipality' ? 'geo.issue.unverified_municipality' : 'geo.issue.invalid_coordinates')}</span>
        </li>)}</ul>
      </details>}
    </div>
  )
}
