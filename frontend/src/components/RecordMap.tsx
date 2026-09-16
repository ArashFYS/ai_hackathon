import { useEffect, useState } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useT } from '../i18n'

const pin = divIcon({
  className: 'record-map-marker',
  html: '<span class="record-map-pin" aria-hidden="true"></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 37],
  popupAnchor: [0, -35],
})

function FitContainer() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function RecordMap({ latitude, longitude, name, address }: {
  latitude: number; longitude: number; name: string; address: string | null
}) {
  const t = useT()
  const [tileError, setTileError] = useState(false)
  return (
    <div className="record-map-wrapper">
      <MapContainer center={[latitude, longitude]} zoom={18} className="record-map" scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={t('map.attribution')}
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <FitContainer />
        <Marker position={[latitude, longitude]} icon={pin} title={name} alt={t('panel.registerPin')}>
          <Popup><strong>{name}</strong><p>{address}</p><p>{t('panel.locationUnverified')}</p></Popup>
        </Marker>
      </MapContainer>
      {tileError && <p role="status" className="record-map-error">{t('panel.tilesFailed')}</p>}
    </div>
  )
}
