import { nlDashboard } from './dashboard'
import { nlLabels } from './labels'
import { nlUi } from './ui'

/** Dutch dictionary (the source of truth for keys). Add a key here and TypeScript demands it in `en` too. */
export const nl = { ...nlLabels, ...nlUi, ...nlDashboard } as const
export { nlLabels, nlUi }
