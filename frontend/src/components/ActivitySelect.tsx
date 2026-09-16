import { useEffect, useState } from 'react'
import type { ActivityCount, RecordType } from '../api'
import { activitySectorLabel, getActivities } from '../api'
import { useLang, useT } from '../i18n'

/** "Activiteit" dropdown: sectors with counts from /api/activities (onbekend last). */
export default function ActivitySelect({ value, onChange, municipality, type }: { value: string; onChange: (sector: string) => void; municipality?: string; type?: RecordType | '' }) {
  const [options, setOptions] = useState<ActivityCount[] | null>(null)
  const t = useT()
  const { lang } = useLang()

  useEffect(() => {
    let cancelled = false
    getActivities({ municipality, type })
      .then((a) => {
        if (!cancelled) setOptions(a)
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [municipality, type])

  return (
    <label className="flex flex-col text-sm">
      <span className="mb-1 text-gray-600">{t('activity.label')}</span>
      <select className="max-w-64 rounded border px-2 py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('common.all')}</option>
        {options === null && value && <option value={value}>{value}</option>}
        {options?.map((a) => (
          <option key={a.sector} value={a.sector}>{activitySectorLabel(lang, a.sector, a.label)} ({a.count})</option>
        ))}
      </select>
    </label>
  )
}
