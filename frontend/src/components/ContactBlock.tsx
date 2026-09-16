import type { Contact, ContactStatus } from '../api'
import { contactTextLabel, dash } from '../api'
import { useLang, useT } from '../i18n'

const STATUS_CLASS: Record<ContactStatus, string> = {
  register: 'bg-green-100 text-green-800',
  zetel: 'bg-blue-100 text-blue-800',
  waargenomen: 'bg-amber-100 text-amber-800',
  onbekend: 'bg-gray-100 text-gray-600',
}

function hrefFor(c: Contact): string {
  if (c.kind === 'phone') return `tel:${c.value.replace(/[\s./-]/g, '')}`
  if (c.kind === 'email') return `mailto:${c.value}`
  return /^https?:\/\//i.test(c.value) ? c.value : `https://${c.value}`
}

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const t = useT()
  const { lang } = useLang()
  return <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_CLASS[status]}`}>{t('contact.badge', { status: contactTextLabel(lang, status) })}</span>
}

/** `c.source` is backend free text ("KBO via VKBO", …): shown as delivered. */
export default function ContactBlock({ contacts, status }: { contacts: Contact[]; status: ContactStatus }) {
  const t = useT()
  if (contacts.length === 0) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">{t('contact.unknown')}</p>
          <ContactStatusBadge status={status} />
        </div>
        <p className="text-xs text-gray-500">{t('contact.hint')}</p>
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
              <th className="py-1 pr-3">{t('contact.col.value')}</th>
              <th className="py-1 pr-3">{t('contact.col.belongsTo')}</th>
              <th className="py-1 pr-3">{t('contact.col.source')}</th>
              <th className="py-1 pr-3">{t('contact.col.date')}</th>
              <th className="py-1">{t('contact.col.link')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contacts.map((c, i) => (
              <tr key={`${c.kind}-${c.value}-${i}`}>
                <td className="py-1 pr-3">
                  <span className="mr-1 text-xs text-gray-500">{t(`contactKind.${c.kind}`)}</span>
                  <a href={hrefFor(c)} className="text-blue-700 hover:underline" {...(c.kind === 'website' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {c.value}
                  </a>
                </td>
                <td className="py-1 pr-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${c.belongs_to === 'vestiging' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-800'}`}>{t(`belongsTo.${c.belongs_to}`)}</span>
                </td>
                <td className="py-1 pr-3 text-gray-700">{c.source}</td>
                <td className="py-1 pr-3 text-gray-700">{dash(c.observed_at)}</td>
                <td className="py-1">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t('common.sourceLink')}</a>
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
