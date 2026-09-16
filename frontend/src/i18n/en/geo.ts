import type { nlGeo } from '../nl/geo'
export const enGeo: Record<keyof typeof nlGeo, string> = {
  'geo.city': 'City or municipality',
  'geo.cityPlaceholder': 'Type or choose a municipality',
  'geo.streetPlaceholder': 'Type a street or choose Street (Municipality)',
  'geo.loaded': '{n} records loaded',
  'geo.notLoaded': 'No business data loaded yet',
  'geo.coverage': 'Suggestions: Province of Antwerp. Street suggestions come from loaded business data.',
  'geo.noCityData': 'No business data has been loaded for {city}. This does not mean there are no businesses.',
  'geo.issueCount': '{n} records without a reliable map position',
  'geo.hiddenExplanation': 'These records remain available but are not shown as business pins. Source coordinates have not been changed.',
  'geo.shownCount': '{shown} map points · {hidden} positions to review',
  'geo.issue.invalid_coordinates': 'Missing or invalid coordinates',
  'geo.issue.outside_expected_area': 'Coordinates do not match the municipality in the address',
  'geo.issue.unverified_municipality': 'Location in this municipality has not been validated',
  'geo.noPins': 'No reliable map positions for this selection.',
  'geo.reset': 'Clear location filters',
  'geo.positionNote': 'Map positions from source data; not confirmation that the business is still active here.',
}
