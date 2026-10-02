import type { ErrorDetail } from '../types/audience'

// The backend reports problems like { field: "conditions.0.count", message: "Too small: expected number to be >=0" }.
// That text is written for developers, so we show our own message for each field instead.
export function friendlyMessage(detail: ErrorDetail): string {
  // "conditions.0.count" -> "count"
  const fieldName = detail.field.split('.').pop()

  switch (fieldName) {
    case 'name':
      return 'Enter a name for this audience.'
    case 'asOf':
      return 'Pick a valid "as of" date.'
    case 'conditions':
      return 'Add at least one condition.'
    case 'eventType':
      return 'Choose an event type.'
    case 'operator':
      return 'Choose an operator.'
    case 'count':
      return 'Event count must be a whole number, 0 or more.'
    case 'withinDays':
      return 'Days must be a whole number from 1 to 365.'
    default:
      return detail.message
  }
}
