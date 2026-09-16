import type { Contact, ContactStatus } from '../api'
import { dash } from '../api'

const STATUS_TEXT: Record<ContactStatus, string> = {
  register: 'in register',
  zetel: 'via zetel',
  waargenomen: 'waargenomen',
  onbekend: 'onbekend',
}
const STATUS_CLASS: Record<ContactStatus, string> = {
  register: 'bg-green-100 text-green-800',
  zetel: 'bg-blue-100 text-blue-800',
  waargenomen: 'bg-amber-100 text-amber-800',
  onbekend: 'bg-gray-100 text-gray-600',
}
const KIND_LABEL: Record<Contact['kind'], string> = { phone: 'Telefoon', email: 'E-mail', website: 'Website' }

function hrefFor(c: Contact): string {
  if (c.kind === 'phone') return `tel:${c.value.replace(/[\s./-]/g, '')}`
  if (c.kind === 'email') return `mailto:${c.value}`
  return /^https?:\/\//i.test(c.value) ? c.value : `https://${c.value}`
}

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_CLASS[status]}`}>contact: {STATUS_TEXT[status]}</span>
}

export default function ContactBlock({ contacts, status }: { contacts: Contact[]; status: ContactStatus }) {
  if (contacts.length === 0) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">contactgegevens onbekend</p>
          <ContactStatusBadge status={status} />
        </div>
        <p className="text-xs text-gray-500">Voeg een waarneming toe met telefoon/website hieronder.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <ContactStatusBadge status={status} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="py-1 pr-3">Waarde</th>
              <th className="py-1 pr-3">Hoort bij</th>
              <th className="py-1 pr-3">Bron</th>
              <th className="py-1 pr-3">Datum</th>
              <th className="py-1">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contacts.map((c, i) => (
              <tr key={`${c.kind}-${c.value}-${i}`}>
                <td className="py-1 pr-3">
                  <span className="mr-1 text-xs text-gray-500">{KIND_LABEL[c.kind]}</span>
                  <a href={hrefFor(c)} className="text-blue-700 hover:underline" {...(c.kind === 'website' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {c.value}
                  </a>
                </td>
                <td className="py-1 pr-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${c.belongs_to === 'vestiging' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-800'}`}>{c.belongs_to}</span>
                </td>
                <td className="py-1 pr-3 text-gray-700">{c.source}</td>
                <td className="py-1 pr-3 text-gray-700">{dash(c.observed_at)}</td>
                <td className="py-1">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">bron ↗</a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
