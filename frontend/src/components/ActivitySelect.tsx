import { useEffect, useState } from 'react'
import type { ActivityCount } from '../api'
import { getActivities } from '../api'

/** "Activiteit" dropdown: sectors with counts from /api/activities (onbekend last). */
export default function ActivitySelect({ value, onChange }: { value: string; onChange: (sector: string) => void }) {
  const [options, setOptions] = useState<ActivityCount[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getActivities()
      .then((a) => {
        if (!cancelled) setOptions(a)
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <label className="flex flex-col text-sm">
      <span className="mb-1 text-gray-600">Activiteit</span>
      <select className="max-w-64 rounded border px-2 py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Alle</option>
        {options === null && value && <option value={value}>{value}</option>}
        {options?.map((a) => (
          <option key={a.sector} value={a.sector}>{a.label} ({a.count})</option>
        ))}
      </select>
    </label>
  )
}
