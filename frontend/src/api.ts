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
export interface Activity {
  sector: string
  label: string
  source: 'KBO (RSZ)' | 'KBO (BTW)' | 'waarneming' | null
  nace: string | null
  description: string | null
}

export interface ActivityCount {
  sector: string
  label: string
  count: number
}

export interface RecordSummary {
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
  record_nr: string
  kind: ProposalKind
  field: string | null
  current_value: string | null
  proposed_value: string | null
  reason: string
  status: ProposalStatus
  created_at: string
  decided_at: string | null
  record?: { display_name: string; address: string | null }
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
}

/** One map marker: GET /records/geo. */
export interface GeoItem {
  nr: string
  display_name: string
  record_type: RecordType
  lat: number
  lng: number
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

export interface GeoQuery {
  street?: string
  status?: Status | ''
  limit?: number
}

export async function getGeo(query: GeoQuery): Promise<GeoItem[]> {
  const data = await api<{ items: GeoItem[] }>(`/records/geo${qs({ ...query })}`)
  return data.items
}

export function getRecord(nr: string): Promise<RecordDetail> {
  return api<RecordDetail>(`/records/${encodeURIComponent(nr)}`)
}

export function fetchParent(nr: string): Promise<RecordSummary> {
  return api<RecordSummary>(`/records/${encodeURIComponent(nr)}/fetch-parent`, { method: 'POST' })
}

export function getNbb(nr: string): Promise<NbbPanelData> {
  return api<NbbPanelData>(`/records/${encodeURIComponent(nr)}/nbb`)
}

export function postEvidence(nr: string, body: EvidenceInput): Promise<Evidence> {
  return api<Evidence>(`/records/${encodeURIComponent(nr)}/evidence`, { method: 'POST', body: JSON.stringify(body) })
}

export function postProposal(nr: string, body: ProposalInput): Promise<Proposal> {
  return api<Proposal>(`/records/${encodeURIComponent(nr)}/proposals`, { method: 'POST', body: JSON.stringify(body) })
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

// Shared Dutch labels + display helpers live in labels.ts; re-exported for convenience.
export * from './labels'
