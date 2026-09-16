// Google Maps listing per record, scraped via the Apify actor compass/crawler-google-places (TICKET-035).
// Types mirror backend/CLAUDE.md "GoogleMapsPlace"; fetch helpers reuse api() from api.ts.
import { api } from './api'

export type MapsMatch = 'adres' | 'adres_andere_naam' | 'naam' | 'geen'
export type MapsStatus = 'open' | 'tijdelijk_gesloten' | 'permanent_gesloten' | 'niet_gevonden'

export interface GoogleMapsReview {
  date: string | null
  stars: number | null
  text: string | null
}

export interface GoogleMapsHours {
  day: string
  hours: string
}

export interface GoogleMapsPlace {
  record_nr: string
  match_quality: MapsMatch
  status: MapsStatus
  search_string: string
  run_id: string | null
  scraped_at: string
  place_id: string | null
  title: string | null
  category: string | null
  categories: string[]
  address: string | null
  street: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  website: string | null
  emails: string[]
  phones: string[]
  social: { instagrams?: string[]; facebooks?: string[]; linkedIns?: string[] }
  rating: number | null
  reviews_count: number | null
  permanently_closed: boolean
  temporarily_closed: boolean
  latest_review_at: string | null
  reviews: GoogleMapsReview[]
  opening_hours: GoogleMapsHours[]
  url: string | null
  image_url: string | null
  lat: number | null
  lng: number | null
}

export interface StreetMapsResult {
  street: string
  searched: number
  found: number
  closed: number
  seconds: number
}

/** One Apify search for this record (30–60 s). 409 when APIFY_TOKEN is missing, 502 when Apify fails. */
export function refreshRecordGoogleMaps(nr: string): Promise<GoogleMapsPlace> {
  return api<GoogleMapsPlace>(`/records/${encodeURIComponent(nr)}/google-maps/refresh`, { method: 'POST' })
}

/** One Apify run for every non-VME record in the street (minutes). */
export function refreshStreetGoogleMaps(street: string): Promise<StreetMapsResult> {
  return api<StreetMapsResult>(`/streets/${encodeURIComponent(street)}/google-maps/refresh`, { method: 'POST' })
}
