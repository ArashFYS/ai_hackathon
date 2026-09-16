/** Numeric presentation only. The current API does not supply a confidence score. */
export default function ConfidenceScore({ score }: { score?: number | null }) {
  const available = typeof score === 'number' && Number.isFinite(score)
  return (
    <span className="confidence-score" title={available ? 'Confidence score' : 'A numeric confidence score has not been provided yet.'}>
      {available ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(score) : 'Not available'}
    </span>
  )
}
