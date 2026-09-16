import { number, percentage } from '../dashboard'

/** Keep counts and shares visually distinct and aligned across dashboard metrics. */
export default function DashboardValue({ value, total, stacked = false }: { value: number; total: number; stacked?: boolean }) {
  return <span className={`dash-value-pair${stacked ? ' is-stacked' : ''}`}>
    <strong>{number(value)}</strong>{' '}
    <span className="dash-share">{percentage(value, total)}</span>
  </span>
}
