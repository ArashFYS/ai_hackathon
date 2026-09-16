import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoItem, Status } from '../api'
import { dash, recordTypeLabel } from '../api'
import { useLang, useT } from '../i18n'
import StatusBadge from './StatusBadge'

export const MARKER_COLOURS: Record<Status, string> = {
  actief: '#168459', ter_controle: '#d58a13', waarschijnlijk_niet_actief: '#c50f35', geen_onderneming: '#73737d',
}

function FitBounds({ points, tick }: { points: [number, number][]; tick: number }) {
  const map = useMap()
  useEffect(() => {
    if (tick === 0 || points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
  }, [map, points, tick])
  return null
}

/** Shared map for Kaart and Dashboard; both use the same marker and dossier popup. */
export default function BusinessMap({ items, className = 'h-[70vh] w-full', outsidePoints = [], fitTick = 0, compact = false }: {
  items: GeoItem[]; className?: string; outsidePoints?: [number, number][]; fitTick?: number; compact?: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  return (
    <MapContainer center={[51.2525, 4.501]} zoom={compact ? 13 : 14} className={className} scrollWheelZoom={!compact}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={t('map.attribution')} />
      <FitBounds points={outsidePoints} tick={fitTick} />
      {items.map((item) => (
        <CircleMarker key={item.nr} center={[item.lat, item.lng]} radius={compact ? 4 : 6}
          pathOptions={{ color: MARKER_COLOURS[item.status], fillColor: MARKER_COLOURS[item.status], fillOpacity: 0.75, weight: 1.5 }}>
          <Popup>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{item.display_name}</div>
              <div className="text-xs text-gray-600">{recordTypeLabel(lang, item.record_type)} · {dash(item.address)}</div>
              <StatusBadge status={item.status} label={item.status_label} />
              {item.outside_municipality && <div className="text-xs text-amber-700">{t('map.outsideNote')}</div>}
              <div><Link to={`/record/${item.nr}`} className="text-blue-700 hover:underline">{t('map.viewDetail')}</Link></div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
