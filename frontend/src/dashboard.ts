import { api, qs } from './api'
import type { ActivityCount, Certainty, ContactStatus, GeoItem, ProposalStatus, RecordsQuery, RecordType, Status } from './api'

export interface DashboardScope { municipality: string; type?: RecordType | ''; activity?: string }
export interface DashboardData {
  scope: DashboardScope & { name: string }
  municipalities: { code: string; name: string }[]
  total: number
  types: Record<RecordType, number>
  statuses: Record<Status, number>
  certainty: Record<Certainty, number>
  contacts: Record<ContactStatus, number>
  with_evidence: number
  missing_parents: number
  sectors: ActivityCount[]
  sector_options: ActivityCount[]
  proposals: Record<ProposalStatus, number>
  unlinked_proposals_all_municipalities: number
  map: GeoItem[]
  provenance: {
    retrieved_from: string | null
    retrieved_to: string | null
    sources: Record<string, number>
    complete_municipality: boolean | null
    registry_snapshot_date: string | null
    computed_at: string
  }
}

export const getDashboard = (scope: DashboardScope) => api<DashboardData>(`/dashboard${qs({ ...scope })}`)
export const number = (value: number) => new Intl.NumberFormat('nl-BE').format(value)
export const percentage = (value: number, total: number) => total ? `${number(Math.round(value / total * 1000) / 10)}%` : '—'
export const share = (value: number, total: number) => total ? value / total * 100 : 0

export function scopeLink(path: string, scope: DashboardScope, extra: RecordsQuery | { status?: ProposalStatus; linked?: boolean } = {}) {
  return `${path}${qs({ ...scope, ...extra })}`
}

/** Search uses API parameter names; the dashboard uses distinct names to preserve old /?type= links. */
export function readRecordQuery(params: URLSearchParams): RecordsQuery {
  return {
    q: params.get('q') || undefined, street: params.get('street') || undefined,
    municipality: params.get('municipality') || undefined,
    type: (params.get('type') || undefined) as RecordType | undefined,
    status: (params.get('status') || undefined) as Status | undefined,
    activity: params.get('activity') || undefined,
    certainty: (params.get('certainty') || undefined) as Certainty | undefined,
    contact: (params.get('contact') || undefined) as ContactStatus | undefined,
    has_evidence: params.has('has_evidence') ? params.get('has_evidence') === 'true' : undefined,
    parent_missing: params.has('parent_missing') ? params.get('parent_missing') === 'true' : undefined,
  }
}
