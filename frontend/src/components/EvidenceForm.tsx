import { useState } from 'react'
import type { Conclusion } from '../api'
import { SOURCE_LABELS, postEvidence } from '../api'

const SOURCES = ['google_maps', 'street_view', 'website', 'terreinbezoek', 'kbo', 'nbb', 'andere'] as const
const CONCLUSIONS: { value: Conclusion; label: string }[] = [
  { value: 'actief', label: "active" },
  { value: 'niet_actief', label: 'inactive' },
  { value: 'onduidelijk', label: "unclear" },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EvidenceForm({ nr, onSaved }: { nr: string; onSaved: () => void }) {
  const [source, setSource] = useState<string>('google_maps')
  const [url, setUrl] = useState('')
  const [observation, setObservation] = useState('')
  const [activity, setActivity] = useState('')
  const [conclusion, setConclusion] = useState<Conclusion>('actief')
  const [observedAt, setObservedAt] = useState(today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!observation.trim()) {
      setError("An observation is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await postEvidence(nr, {
        source,
        url: url.trim() || undefined,
        observation: observation.trim(),
        observed_activity: activity.trim() || undefined,
        conclusion,
        observed_at: observedAt,
      })
      setUrl('')
      setObservation('')
      setActivity('')
      onSaved()
    } catch {
      setError("Could not save the observation.")
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded border px-2 py-1 text-sm'
  return (
    <form onSubmit={submit} className="evidence-form grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">Source</span>
        <select className={inp} value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">URL (optional)</span>
        <input className={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label className="flex flex-col sm:col-span-2">
        <span className="text-xs text-gray-600">Observation</span>
        <textarea className={inp} rows={2} value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="What did you observe?" />
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">Observed activity (optional)</span>
        <input className={inp} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. bakery, hair salon" />
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">Observation date</span>
        <input type="date" className={inp} value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-gray-600">Conclusion</legend>
        <div className="mt-1 flex gap-4">
          {CONCLUSIONS.map((c) => (
            <label key={c.value} className="flex items-center gap-1">
              <input type="radio" name="conclusion" value={c.value} checked={conclusion === c.value} onChange={() => setConclusion(c.value)} />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {busy ? "Saving…" : "Save observation"}
        </button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </form>
  )
}
