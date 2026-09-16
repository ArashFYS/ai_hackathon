import type { Certainty, Conclusion, ContactStatus, ProposalStatus, RecordType, Status } from './api'


export const STATUS_LABELS: Record<Status, string> = {
  actief: 'Actief',
  ter_controle: 'Ter controle',
  waarschijnlijk_niet_actief: 'Waarschijnlijk niet actief',
  geen_onderneming: 'Geen onderneming',
}

export const CERTAINTY_LABELS: Record<Certainty, string> = { hoog: 'Hoog', middel: 'Middel', laag: 'Laag' }

export const CONCLUSION_LABELS: Record<Conclusion, string> = {
  actief: 'actief',
  niet_actief: 'niet actief',
  onduidelijk: 'onduidelijk',
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  open: 'Open',
  bevestigd: 'Bevestigd',
  afgewezen: 'Afgewezen',
}

export const SOURCE_LABELS: Record<string, string> = {
  google_maps: 'Google Maps',
  street_view: 'Street View',
  website: 'Website',
  terreinbezoek: 'Terreinbezoek',
  kbo: 'KBO',
  nbb: 'NBB',
  inhoudingsplicht: 'Check Inhoudingsplicht',
  staatsblad: 'Belgisch Staatsblad',
  andere: 'Andere',
}

/** Short contact indicator for lists (no icon library). */
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  register: '☎ register',
  zetel: '☎ zetel',
  waargenomen: '☎ waargenomen',
  onbekend: '—',
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  enterprise: 'onderneming',
  establishment: 'vestiging',
}

/** Display helper: null/empty → "—". */
export function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

/** Display helper: null/empty → "onbekend". */
export function onbekend(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'onbekend'
  return v
}

export const KIND_LABELS: Record<string, string> = {
  status_change: 'Statuswijziging',
  address_check: 'Adres nazien',
  missing_establishment: 'Vestiging ontbreekt',
  field_correction: 'Veldcorrectie',
}

/** Proposal values may be raw status codes; show the Dutch label when they are. */
export function valueLabel(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return STATUS_LABELS[v as Status] ?? v
}
