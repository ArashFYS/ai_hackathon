import { useEffect, useState } from 'react'
import type { LocationOptions, Status } from '../api'
import { getLocationOptions, STATUS_CODES, statusLabel } from '../api'
import { useLang, useT } from '../i18n'

export default function MapLocationFilters({ city, street, status, onChange }: {
  city: string; street: string; status: Status | ''
  onChange: (next: { city?: string; street?: string; status?: string }) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const [options, setOptions] = useState<LocationOptions | null>(null)
  const [cityInput, setCityInput] = useState(city)
  const [streetInput, setStreetInput] = useState(street)
  useEffect(() => setCityInput(city), [city])
  useEffect(() => setStreetInput(street), [street])
  useEffect(() => {
    let cancelled = false
    getLocationOptions().then((data) => { if (!cancelled) setOptions(data) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const matchingCity = options?.cities.find((entry) => entry.name.toLowerCase() === cityInput.trim().toLowerCase())
  const streets = options?.streets.filter((entry) => !matchingCity || entry.city === matchingCity.name) ?? []
  const selectedStreet = (text: string) => options?.streets.find((entry) =>
    (entry.street + ' (' + entry.city + ')').toLowerCase() === text.trim().toLowerCase())
  function submit() {
    const selected = selectedStreet(streetInput)
    onChange({ city: selected?.city ?? matchingCity?.name ?? cityInput.trim(), street: selected?.street ?? streetInput.trim() })
  }
  return (
    <div>
      <form className="map-location-filters page-filters" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label><span>{t('geo.city')}</span>
          <input list="map-cities" value={cityInput} placeholder={t('geo.cityPlaceholder')} onChange={(e) => {
            setCityInput(e.target.value)
            setStreetInput('')
          }} />
          <datalist id="map-cities">{options?.cities.map((entry) =>
            <option key={entry.name} value={entry.name} label={entry.count ? t('geo.loaded', { n: entry.count }) : t('geo.notLoaded')} />)}</datalist>
        </label>
        <label className="map-street-input"><span>{t('common.street')}</span>
          <input list="map-streets" value={streetInput} placeholder={t('geo.streetPlaceholder')} onChange={(e) => {
            setStreetInput(e.target.value)
            const selected = selectedStreet(e.target.value)
            if (selected) setCityInput(selected.city)
          }} />
          <datalist id="map-streets">{streets.map((entry) =>
            <option key={entry.city + entry.street} value={entry.street + ' (' + entry.city + ')'} label={t('geo.loaded', { n: entry.count })} />)}</datalist>
        </label>
        <label><span>{t('common.status')}</span>
          <select value={status} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="">{t('common.all')}</option>
            {STATUS_CODES.map((value) => <option key={value} value={value}>{statusLabel(lang, value)}</option>)}
          </select>
        </label>
        <button type="submit">{t('map.show')}</button>
        {(city || street) && <button type="button" className="result-action" onClick={() => {
          setCityInput(''); setStreetInput(''); onChange({ city: '', street: '' })
        }}>{t('geo.reset')}</button>}
      </form>
      <p className="text-xs text-gray-500 mb-3">{t('geo.coverage')}</p>
      {city && options && !options.cities.some((entry) => entry.name.toLowerCase() === city.toLowerCase() && entry.count > 0)
        && <p className="text-sm text-amber-800 mb-3" role="status">{t('geo.noCityData', { city })}</p>}
    </div>
  )
}
