import type { RecordFull } from './api'

/** Pin the register coordinates; never let a business-name search choose the location. */
export function mapLocation(record: RecordFull) {
  const { lat, lng } = record
  const validNumbers = typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  const hasCoordinates = validNumbers && record.location_valid !== false
  const query = hasCoordinates ? `${lat},${lng}` : record.address?.trim()
  const encoded = query ? encodeURIComponent(query) : null
  const needsReview = record.location_valid === false || record.assessment.reasons.some((reason) =>
    ['buiten_schoten', 'adres_afwijking'].includes(reason.code))
  return {
    embed: encoded ? `https://maps.google.com/maps?q=${encoded}&z=18&output=embed` : null,
    open: encoded ? `https://www.google.com/maps/search/?api=1&query=${encoded}` : null,
    hasCoordinates,
    needsReview,
    label: hasCoordinates ? "Pin at register coordinates (VKBO)" : "Address search · no register coordinates",
    coordinates: hasCoordinates ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : null,
  }
}
