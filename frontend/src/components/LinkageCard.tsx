import { useState } from 'react'
import type { RecordDetail } from '../api'
import { ApiError, fetchParent } from '../api'
import { useT } from '../i18n'
import RecordCard from './RecordCard'

interface Props {
  detail: RecordDetail
  onChanged: () => void
}

export default function LinkageCard({ detail, onChanged }: Props) {
  const t = useT()
  const { record, parent, parent_in_dataset, seat_elsewhere, establishments } = detail
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function fetchViaVkbo() {
    setBusy(true)
    setMsg(null)
    try {
      await fetchParent(record.nr)
      setMsg(t('linkage.fetched'))
      onChanged()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMsg(t('linkage.notFound'))
      else setMsg(t('linkage.fetchError'))
    } finally {
      setBusy(false)
    }
  }

  if (record.record_type === 'establishment') {
    return (
      <div className="linkage-content text-sm">
        <p className="text-gray-600">
          {t('linkage.belongsTo')}{' '}
          <span className="font-mono">{record.parent_nr ?? t('common.unknown')}</span>
          {seat_elsewhere && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{t('linkage.seatElsewhere')}</span>}
        </p>
        {parent ? (
          <RecordCard record={parent} tag={seat_elsewhere ? t('linkage.seatElsewhere') : undefined} />
        ) : (
          <div className="linked-missing">
            <p className="text-gray-700">{t('linkage.parentNotInDataset')}</p>
            {record.parent_nr && (
              <button
                type="button"
                onClick={fetchViaVkbo}
                disabled={busy}
                className="mt-2 rounded border bg-white px-3 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {busy ? t('linkage.fetching') : t('linkage.fetchVkbo')}
              </button>
            )}
          </div>
        )}
        {!parent_in_dataset && parent && <p className="text-xs text-gray-500">{t('linkage.fetchedNote')}</p>}
        {msg && <p className="text-xs text-gray-600">{msg}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      {establishments.length === 0 ? (
        <p className="text-gray-600">{t('linkage.noEstablishments')}</p>
      ) : (
        <>
          <p className="text-gray-600">{t('linkage.establishmentsCount', { n: establishments.length })}</p>
          <div className="space-y-1.5">
            {establishments.map((e) => (
              <RecordCard key={e.nr} record={e} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
