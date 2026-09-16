// Types mirror backend/CLAUDE.md "API contract" exactly. Do not invent fields.

export type Status = 'actief' | 'ter_controle' | 'waarschijnlijk_niet_actief' | 'geen_onderneming'
export type Certainty = 'hoog' | 'middel' | 'laag'
export type Direction = 'negatief' | 'positief' | 'neutraal'
export type Weight = 'sterk' | 'matig' | 'zwak'
export type Conclusion = 'actief' | 'niet_actief' | 'onduidelijk'
export type ProposalStatus = 'open' | 'bevestigd' | 'afgewezen'
export type ProposalKind = 'status_change' | 'address_check' | 'missing_establishment' | 'field_correction'
export type RecordType = 'enterprise' | 'establishment'
export type ContactStatus = 'register' | 'zetel' | 'waargenomen' | 'onbekend'
export type ContactKind = 'phone' | 'email' | 'website'

/** One known contact detail with its owner (vestiging / zetel), source and date. */
export interface Contact {
  kind: ContactKind
  value: string
  belongs_to: 'vestiging' | 'zetel'
  source: string
  observed_at: string | null
  url: string | null
}

export interface Reason {
  code: string
  text: string
  direction: Direction
  weight: Weight
  /** Provenance: where the reason comes from, so the officer can verify it. */
  source: string | null
  field: string | null
  observed_at: string | null
  url: string | null
}

export interface Assessment {
  status: Status
  status_label: string
  certainty: Certainty
  certainty_label: string
  register_label: string
  reasons: Reason[]
  proposal_text: string
  last_observed: string | null
}

/** Sector of a record: from KBO NACE (RSZ → BTW) or the latest officer-observed activity; else onbekend. */
/** One NACEBEL 2025 activity as listed on the KBO Public Search page (TICKET-035). */
export interface NaceActivity {
  code: string
  title: string | null
  kind: 'hoofd' | 'neven'
  since: string | null
}

export interface Activity {
  sector: string
  label: string
  source: 'KBO (RSZ)' | 'KBO (BTW)' | 'KBO (publiek)' | 'waarneming' | null
  nace: string | null
  description: string | null
  activities: NaceActivity[]
}

/** Cached scrape of the record's own KBO Public Search page (null when never fetched). */
export interface KboPublic {
  available: boolean
  url: string
  status: string | null
  snapshot_date: string | null
  phone: string | null
  email: string | null
  website: string | null
  activities: NaceActivity[]
  note: string | null
  fetched_at?: string
}

export interface ActivityCount {
  sector: string
  label: string
  count: number
}

export type IndicatorLevel = 'groen' | 'geel' | 'rood' | 'onbekend'

export interface Indicator {
  level: IndicatorLevel
  label: string
  text: string
  checked_at: string | null
  url: string | null
}

export interface Indicators {
  kbo: Indicator
  google_maps: Indicator
  einvoice: Indicator
}

export interface RecordSummary {
  location_valid?: boolean
  location_issue?: 'invalid_coordinates' | 'outside_expected_area' | 'unverified_municipality' | null
  nr: string
  record_type: RecordType
  parent_nr: string | null
  display_name: string
  name: string | null
  trade_name: string | null
  legal_form: string | null
  legal_status: string | null
  address: string | null
  kbo_street: string | null
  kbo_housenr: string | null
  kbo_box: string | null
  kbo_postcode: string | null
  kbo_municipality: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  start_date: string | null
  assessment: Assessment
  activity: Activity
  contact_status: ContactStatus
  indicators: Indicators
  parent_in_dataset?: boolean
  seat_elsewhere?: boolean
  parent_display_name?: string | null
}

/** Every column of `records` except `raw` (see backend/app/schema.sql). */
export interface RecordFull extends RecordSummary {
  short_name: string | null
  search_name: string | null
  entity_type: string | null
  registration_date: string | null
  cessation_date: string | null
  cessation_reason: string | null
  closing_date: string | null
  exofficio_strike_start: string | null
  exofficio_strike_end: string | null
  exofficio_strike_reason: string | null
  kbo_niscode: string | null
  address_strike_date: string | null
  address_strike_reason: string | null
  ar_street: string | null
  ar_housenr: string | null
  ar_box: string | null
  ar_postcode: string | null
  nace_vat: string | null
  nace_vat_desc: string | null
  nace_rsz: string | null
  nace_rsz_desc: string | null
  staff_class: string | null
  nbb_url: string | null
  source: string
  fetched_at: string
}

export interface Evidence {
  id: number
  record_nr: string
  source: string
  url: string | null
  observation: string
  observed_activity: string | null
  conclusion: Conclusion
  observed_at: string
  created_at: string
  phone: string | null
  email: string | null
  website: string | null
}

export interface Proposal {
  id: number
  /** null for kind 'missing_establishment': a business seen on the street with no KBO record there. */
  record_nr: string | null
  kind: ProposalKind
  field: string | null
  current_value: string | null
  proposed_value: string | null
  reason: string
  status: ProposalStatus
  created_at: string
  decided_at: string | null
  /** The record's name/address when record_nr is set, else the observed name / observed address. */
  display_name: string
  address: string | null
  observed_name: string | null
  observed_activity: string | null
  source: string | null
  source_url: string | null
  observed_at: string | null
  record?: { display_name: string; address: string | null } | null
}

export interface Links {
  google_maps_embed: string
  google_maps: string
  street_view_embed: string
  street_view: string
  kbo_public: string
  kbo_public_embed: string
  kbo_establishments: string
  nbb_consult: string
  inhoudingsplicht_embed: string | null
  inhoudingsplicht: string
  staatsblad: string | null
  web_search_embed: string
  web_search: string
}

export interface RecordDetail {
  record: RecordFull
  parent: RecordSummary | null
  parent_in_dataset: boolean
  seat_elsewhere: boolean
  establishments: RecordSummary[]
  evidence: Evidence[]
  proposals: Proposal[]
  links: Links
  contacts: Contact[]
  contact_status: ContactStatus
  kbo_public: KboPublic | null
}

export interface NbbFigures {
  omzet: number | null
  brutomarge: number | null
  bedrijfsresultaat: number | null
  winst_verlies: number | null
  eigen_vermogen: number | null
  balanstotaal: number | null
  vte: number | null
}

export interface NbbDeposit {
  id: string
  year: string | number | null
  period_start: string | null
  period_end: string | null
  model: string | null
  deposit_date: string | null
  pdf_url: string | null
  figures: NbbFigures | null
}

export interface NbbCompany {
  name: string | null
  legal_form: string | null
  legal_situation: string | null
  legal_situation_date: string | null
  address: string | null
  email?: string | null
  website?: string | null
}

export interface NbbPanelData {
  available: boolean
  enterprise_nr: string | null
  url: string | null
  company: NbbCompany | null
  deposits: NbbDeposit[]
  last_deposit_date: string | null
  months_since_last_deposit: number | null
  fetched_at: string | null
  note: string | null
}

export interface StreetCount {
  street: string
  count: number
}

export interface StreetRecord extends RecordSummary {
  last_evidence: Evidence | null
  open_proposal: Proposal | null
}

export interface StreetAddress {
  address: string
  housenr: string | null
  lat: number | null
  lng: number | null
  records: StreetRecord[]
}

export interface StreetOverview {
  street: string
  addresses: StreetAddress[]
  /** Open 'missing_establishment' proposals whose address starts with this street. */
  missing: Proposal[]
}

/** One map marker: GET /records/geo. */
export interface GeoItem {
  nr: string
  display_name: string
  record_type: RecordType
  lat: number | null
  lng: number | null
  city: string | null
  location_valid: boolean
  location_issue: 'invalid_coordinates' | 'outside_expected_area' | 'unverified_municipality' | null
  status: Status
  status_label: string
  certainty: Certainty
  address: string | null
  /** lat/lng outside the Schoten bbox used in scoring. */
  outside_municipality: boolean
}

export interface EvidenceInput {
  source: string
  url?: string
  observation: string
  observed_activity?: string
  conclusion: Conclusion
  observed_at: string
  phone?: string
  email?: string
  website?: string
}

export interface ProposalInput {
  kind: ProposalKind
  field?: string
  current_value?: string
  proposed_value?: string
  reason: string
}

export type MissingSource = 'google_maps' | 'street_view' | 'terreinbezoek' | 'website' | 'andere'

/** Body of POST /proposals/missing ("Vestiging ontbreekt op dit adres"). */
export interface MissingInput {
  street: string
  housenr: string
  box?: string
  postcode: string
  municipality: string
  observed_name: string
  observed_activity?: string
  source: MissingSource
  source_url?: string
  observed_at: string
  reason: string
}

// ---------- fetch helper ----------

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ---------- endpoints ----------

export interface RecordsQuery {
  mode?: 'phrase' | 'and' | 'or'
  q?: string
  street?: string
  type?: RecordType | ''
  status?: Status | ''
  activity?: string
  limit?: number
}

export async function getRecords(query: RecordsQuery): Promise<RecordSummary[]> {
  const data = await api<{ items: RecordSummary[] }>(`/records${qs({ ...query })}`)
  return data.items
}

export interface SearchResult {
  items: RecordSummary[]
  total: number
}

export function getExportContacts(numbers: string[], signal?: AbortSignal): Promise<{ contacts: Record<string, Contact[]> }> {
  return api('/records/contacts', { method: 'POST', body: JSON.stringify({ numbers }), signal })
}

export function getSearchResults(query: RecordsQuery, signal?: AbortSignal): Promise<SearchResult> {
  return api<SearchResult>(`/records${qs({ ...query })}`, { signal })
}

export interface GeoQuery {
  city?: string
  street?: string
  status?: Status | ''
  limit?: number
}

export interface LocationOptions {
  province: string
  cities: { name: string; count: number }[]
  streets: { street: string; city: string; count: number }[]
}

export function getLocationOptions(): Promise<LocationOptions> {
  return api<LocationOptions>('/locations')
}

export async function getGeo(query: GeoQuery): Promise<GeoItem[]> {
  const data = await api<{ items: GeoItem[] }>(`/records/geo${qs({ ...query })}`)
  return data.items
}

export function getRecord(nr: string): Promise<RecordDetail> {
  return api<RecordDetail>(`/records/${encodeURIComponent(nr)}`)
}

export interface StaatsbladPublication {
  date: string
  rubric: string | null
  pdf_url: string | null
  article_url: string
  likely_gemachtigde: boolean
}

export interface StaatsbladData {
  available: boolean
  url: string | null
  last_publication: string | null
  count: number
  publications: StaatsbladPublication[]
  note: string | null
}

/** Live fetch of the Belgisch Staatsblad publication list (enterprise level); cached server-side. */
export function refreshStaatsblad(nr: string): Promise<StaatsbladData> {
  return api<StaatsbladData>(`/records/${encodeURIComponent(nr)}/staatsblad`, { method: 'POST' })
}

/** Live fetch of the KBO Public Search page (activities, contact, status); cached server-side. */
export function refreshKboPublic(nr: string): Promise<KboPublic> {
  return api<KboPublic>(`/records/${encodeURIComponent(nr)}/kbo-public`, { method: 'POST' })
}

export function fetchParent(nr: string): Promise<RecordSummary> {
  return api<RecordSummary>(`/records/${encodeURIComponent(nr)}/fetch-parent`, { method: 'POST' })
}

export function getNbb(nr: string): Promise<NbbPanelData> {
  return api<NbbPanelData>(`/records/${encodeURIComponent(nr)}/nbb`)
}

export interface StreetRefreshResult {
  street: string
  records: number
  kbo: Record<IndicatorLevel, number>
  google_maps: Record<IndicatorLevel, number>
  einvoice: Record<IndicatorLevel, number>
  seconds: number
}

/** Live (cached) Peppol lookup for one record; KBO and Google Maps lights recomputed. */
export function getIndicators(nr: string): Promise<Indicators> {
  return api<Indicators>(`/records/${encodeURIComponent(nr)}/indicators`)
}

/** Sequential lookups for every record in a street (demo pre-fill); can take ~30 s. */
export function refreshStreetIndicators(street: string): Promise<StreetRefreshResult> {
  return api<StreetRefreshResult>(`/streets/${encodeURIComponent(street)}/indicators/refresh`, { method: 'POST' })
}

export function postEvidence(nr: string, body: EvidenceInput): Promise<Evidence> {
  return api<Evidence>(`/records/${encodeURIComponent(nr)}/evidence`, { method: 'POST', body: JSON.stringify(body) })
}

export function postProposal(nr: string, body: ProposalInput): Promise<Proposal> {
  return api<Proposal>(`/records/${encodeURIComponent(nr)}/proposals`, { method: 'POST', body: JSON.stringify(body) })
}

export function postMissing(body: MissingInput): Promise<Proposal> {
  return api<Proposal>('/proposals/missing', { method: 'POST', body: JSON.stringify(body) })
}

export function getStreets(): Promise<StreetCount[]> {
  return api<StreetCount[]>('/streets')
}

export function getStreet(street: string, activity?: string): Promise<StreetOverview> {
  return api<StreetOverview>(`/streets/${encodeURIComponent(street)}${qs({ activity })}`)
}

export function getActivities(): Promise<ActivityCount[]> {
  return api<ActivityCount[]>('/activities')
}

export function getProposals(status?: ProposalStatus): Promise<Proposal[]> {
  return api<Proposal[]>(`/proposals${qs({ status })}`)
}

export function decideProposal(id: number, status: 'bevestigd' | 'afgewezen'): Promise<Proposal> {
  return api<Proposal>(`/proposals/${id}/decide`, { method: 'POST', body: JSON.stringify({ status }) })
}

export function exportUrl(format: 'csv' | 'json'): string {
  return `/api/proposals/export?format=${format}`
}

// Language-aware label helpers + display helpers live in labels.ts (text in src/i18n); re-exported for convenience.
export * from './labels'
