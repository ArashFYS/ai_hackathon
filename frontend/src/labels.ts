import type { Certainty, Conclusion, ProposalStatus, RecordType, Status } from './api'


export const STATUS_LABELS: Record<Status, string> = {
  actief: "Active",
  ter_controle: "Needs review",
  waarschijnlijk_niet_actief: "Likely inactive",
  geen_onderneming: "Not a business",
}

export const CERTAINTY_LABELS: Record<Certainty, string> = { hoog: "High", middel: "Medium", laag: "Low" }

export const CONCLUSION_LABELS: Record<Conclusion, string> = {
  actief: "active",
  niet_actief: 'inactive',
  onduidelijk: "unclear",
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  open: 'Open',
  bevestigd: "Approved",
  afgewezen: "Rejected",
}

export const SOURCE_LABELS: Record<string, string> = {
  google_maps: 'Google Maps',
  street_view: 'Street View',
  website: 'Website',
  terreinbezoek: "Site visit",
  kbo: 'KBO',
  nbb: 'NBB',
  inhoudingsplicht: "Withholding check",
  andere: "Other",
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  enterprise: "enterprise",
  establishment: "establishment",
}

/** Display helper: null/empty → "—". */
export function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

/** Display helper: null/empty → "onbekend". */
export function onbekend(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return "unknown"
  return v
}

export const KIND_LABELS: Record<string, string> = {
  status_change: "Status change",
  address_check: "Review address",
  missing_establishment: "Missing establishment",
  field_correction: "Field correction",
}

/** Proposal values may be raw status codes; show the Dutch label when they are. */
export function valueLabel(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return STATUS_LABELS[v as Status] ?? v
}
