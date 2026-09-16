import { useEffect, useState } from 'react'
import type { NbbPanelData } from '../api'
import { getNbb, dash } from '../api'

const eur = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function money(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : eur.format(v)
}

function num(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 1 }).format(v)
}

export default function NbbPanel({ nr, nbbConsultUrl }: { nr: string; nbbConsultUrl: string }) {
  const [data, setData] = useState<NbbPanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getNbb(nr)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setError('Kon gegevens niet laden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nr])

  const openLink = (
    <a href={data?.url || nbbConsultUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">
      Open in NBB ↗
    </a>
  )

  if (loading) return <div className="p-3 text-sm text-gray-500">Laden…</div>
  if (error) return <div className="space-y-2 p-3 text-sm"><p className="text-red-700">{error}</p>{openLink}</div>
  if (!data) return <div className="p-3 text-sm text-gray-500">Geen resultaten</div>

  if (!data.available) {
    return (
      <div className="space-y-2 p-3 text-sm">
        <p className="text-gray-700">{data.note ?? 'Geen jaarrekeningen beschikbaar.'}</p>
        {openLink}
      </div>
    )
  }

  const c = data.company
  return (
    <div className="space-y-3 overflow-auto p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{c?.name ?? dash(data.enterprise_nr)}</p>
          <p className="text-xs text-gray-600">
            {dash(c?.legal_form)}
            {c?.legal_situation ? ` · ${c.legal_situation}${c.legal_situation_date ? ` (${c.legal_situation_date})` : ''}` : ''}
          </p>
          {c?.address && <p className="text-xs text-gray-600">{c.address}</p>}
        </div>
        {openLink}
      </div>
      <p className="text-gray-700">
        Laatste neerlegging: <span className="font-medium">{dash(data.last_deposit_date)}</span>
        {data.months_since_last_deposit !== null && data.months_since_last_deposit !== undefined && (
          <span className="text-gray-500"> ({data.months_since_last_deposit} maanden geleden)</span>
        )}
      </p>
      {data.note && <p className="text-xs text-gray-500">{data.note}</p>}
      {data.deposits.length === 0 ? (
        <p className="text-gray-500">Geen neerleggingen gevonden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-2 py-1">Boekjaar</th>
                <th className="px-2 py-1">Model</th>
                <th className="px-2 py-1 text-right">Omzet</th>
                <th className="px-2 py-1 text-right">Brutomarge</th>
                <th className="px-2 py-1 text-right">Winst/verlies</th>
                <th className="px-2 py-1 text-right">Eigen vermogen</th>
                <th className="px-2 py-1 text-right">VTE</th>
                <th className="px-2 py-1">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.deposits.map((d) => (
                <tr key={d.id}>
                  <td className="px-2 py-1 whitespace-nowrap">{dash(d.year ?? d.period_end)}</td>
                  <td className="px-2 py-1">{dash(d.model)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">{money(d.figures?.omzet)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">{money(d.figures?.brutomarge)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">{money(d.figures?.winst_verlies)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">{money(d.figures?.eigen_vermogen)}</td>
                  <td className="px-2 py-1 text-right">{num(d.figures?.vte)}</td>
                  <td className="px-2 py-1">
                    {d.pdf_url ? (
                      <a href={d.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">PDF ↗</a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.fetched_at && <p className="text-xs text-gray-400">Opgehaald: {data.fetched_at.slice(0, 16).replace('T', ' ')}</p>}
    </div>
  )
}
