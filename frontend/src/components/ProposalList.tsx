import { useState } from 'react'
import type { Proposal, ProposalStatus } from '../api'
import { KIND_LABELS, PROPOSAL_STATUS_LABELS, decideProposal, valueLabel } from '../api'

const CHIP: Record<ProposalStatus, string> = {
  open: 'bg-amber-100 text-amber-800',
  bevestigd: 'bg-green-100 text-green-800',
  afgewezen: 'bg-gray-100 text-gray-600',
}

export function ProposalStatusChip({ status }: { status: ProposalStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${CHIP[status] ?? CHIP.open}`}>
      {PROPOSAL_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function DecideButtons({ proposal, onDecided, size = 'sm' }: { proposal: Proposal | null; onDecided: () => void; size?: 'sm' | 'xs' }) {
  const [busy, setBusy] = useState<'bevestigd' | 'afgewezen' | null>(null)
  const [error, setError] = useState(false)
  const disabled = !proposal || proposal.status !== 'open' || busy !== null
  const title = !proposal || proposal.status !== 'open' ? "No open proposal" : undefined
  const pad = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  async function decide(status: 'bevestigd' | 'afgewezen') {
    if (!proposal) return
    setBusy(status)
    setError(false)
    try {
      await decideProposal(proposal.id, status)
      onDecided()
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" title={title} disabled={disabled} onClick={() => decide('bevestigd')}
        className={`rounded border border-green-700 bg-green-700 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 ${pad}`}>
        {busy === 'bevestigd' ? '…' : "Approve"}
      </button>
      <button type="button" title={title} disabled={disabled} onClick={() => decide('afgewezen')}
        className={`rounded border bg-white font-medium text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 ${pad}`}>
        {busy === 'afgewezen' ? '…' : "Reject"}
      </button>
      {error && <span className="text-xs text-red-700">Failed</span>}
    </span>
  )
}

export default function ProposalList({ proposals, onChanged }: { proposals: Proposal[]; onChanged: () => void }) {
  if (proposals.length === 0) return <p className="text-sm text-gray-500">No proposals.</p>
  return (
    <ul className="divide-y text-sm">
      {proposals.map((p) => (
        <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{KIND_LABELS[p.kind] ?? p.kind}{p.field ? ` · ${p.field}` : ''}</span>
              <ProposalStatusChip status={p.status} />
            </div>
            <p className="text-gray-800">{p.reason}</p>
            {(p.current_value || p.proposed_value) && (
              <p className="text-xs text-gray-600">
                <span className="line-through">{valueLabel(p.current_value)}</span> → <span className="font-medium">{valueLabel(p.proposed_value)}</span>
              </p>
            )}
            <p className="text-xs text-gray-400">
              Created {p.created_at?.slice(0, 10)}{p.decided_at ? ` · decided ${p.decided_at.slice(0, 10)}` : ''}
            </p>
          </div>
          {p.status === 'open' && <DecideButtons proposal={p} onDecided={onChanged} />}
        </li>
      ))}
    </ul>
  )
}
