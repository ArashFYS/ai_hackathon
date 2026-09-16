import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoItem, Status } from '../api'
import { RECORD_TYPE_LABELS, STATUS_LABELS, dash, getGeo } from '../api'
import StatusBadge from '../components/StatusBadge'

const SCHOTEN_CENTER: [number, number] = [51.2525, 4.501]
const SCHOTEN_ZOOM = 14

const MARKER_COLOURS: Record<Status, string> = {
  actief: '#16a34a',
  ter_controle: '#d97706',
  waarschijnlijk_niet_actief: '#dc2626',
  geen_onderneming: '#6b7280',
}

/** Fits the map to `points` every time `tick` changes (click on "Buiten Schoten"). */
function FitBounds({ points, tick }: { points: [number, number][]; tick: number }) {
  const map = useMap()
  useEffect(() => {
    if (tick === 0 || points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
  }, [map, points, tick])
  return null
}

export default function Kaart() {
  const [searchParams, setSearchParams] = useSearchParams()
  const street = searchParams.get('street') ?? ''
  const status = (searchParams.get('status') ?? '') as Status | ''
  const [streetInput, setStreetInput] = useState(street)
  const [items, setItems] = useState<GeoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fitTick, setFitTick] = useState(0)

  useEffect(() => setStreetInput(street), [street])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getGeo({ street: street || undefined, status: status || undefined, limit: 2000 })
      .then((d) => {
        if (!cancelled) {
          setItems(d)
          setFitTick(0) // new data: stay where the officer is, don't re-fit to the outliers
        }
      })
      .catch(() => {
        if (!cancelled) setError('Kon kaartgegevens niet laden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [street, status])

  const outside = useMemo(() => items.filter((i) => i.outside_municipality), [items])
  const outsidePoints = useMemo<[number, number][]>(() => outside.map((i) => [i.lat, i.lng]), [outside])

  function updateParams(next: { street?: string; status?: string }) {
    const p = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setSearchParams(p)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kaart</h1>
        <p className="text-sm text-gray-600">
          Alle records met coördinaten, gekleurd volgens status. Klik op een punt voor de details.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm"
        onSubmit={(e) => {
          e.preventDefault()
          updateParams({ street: streetInput.trim() })
        }}
      >
        <label className="flex flex-col">
          <span className="mb-1 text-gray-600">Straat</span>
          <input
            className="min-w-56 rounded border px-2 py-1.5"
            placeholder="bv. Paalstraat"
            value={streetInput}
            onChange={(e) => setStreetInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-600">Status</span>
          <select className="rounded border px-2 py-1.5" value={status} onChange={(e) => updateParams({ status: e.target.value })}>
            <option value="">Alle</option>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded border bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700">Toon</button>
        {street && (
          <button type="button" className="rounded border px-3 py-1.5 text-gray-700 hover:bg-gray-100" onClick={() => updateParams({ street: '' })}>
            Wis straat
          </button>
        )}
        <span className="pb-2 text-xs text-gray-500">
          {loading ? 'Laden…' : error ? <span className="text-red-700">{error}</span> : `${items.length} punten op de kaart`}
        </span>
        <button
          type="button"
          title="Coördinaten buiten de gemeentegrens van Schoten (datakwaliteit). Klik om ze op de kaart te tonen."
          className="ml-auto rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          disabled={outside.length === 0}
          onClick={() => setFitTick((t) => t + 1)}
        >
          Buiten Schoten: {outside.length}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white">
        <MapContainer center={SCHOTEN_CENTER} zoom={SCHOTEN_ZOOM} className="h-[70vh] w-full" scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap-bijdragers" />
          <FitBounds points={outsidePoints} tick={fitTick} />
          {items.map((i) => (
            <CircleMarker
              key={i.nr}
              center={[i.lat, i.lng]}
              radius={6}
              pathOptions={{ color: MARKER_COLOURS[i.status], fillColor: MARKER_COLOURS[i.status], fillOpacity: 0.7, weight: 1.5 }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{i.display_name}</div>
                  <div className="text-xs text-gray-600">
                    {RECORD_TYPE_LABELS[i.record_type]} · {dash(i.address)}
                  </div>
                  <StatusBadge status={i.status} label={i.status_label} />
                  {i.outside_municipality && <div className="text-xs text-amber-700">Coördinaten liggen buiten Schoten</div>}
                  <div>
                    <Link to={`/record/${i.nr}`} className="text-blue-700 hover:underline">Bekijk detail →</Link>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white px-4 py-2 text-xs text-gray-700">
        <span className="font-medium text-gray-600">Legenda</span>
        {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: MARKER_COLOURS[s] }} />
            {STATUS_LABELS[s]}
          </span>
        ))}
        <span className="text-gray-500">
          Enkele punten liggen ver buiten Schoten: controleer het adres en de coördinaten van die records.
        </span>
      </div>
    </div>
  )
}
