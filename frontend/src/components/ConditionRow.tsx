import type { Condition, EventType, Operator } from '../types/audience'
import { EVENT_TYPE_OPTIONS, OPERATOR_OPTIONS } from '../types/audience'

// "Props" are the values the parent (App) hands to this component.
interface ConditionRowProps {
  index: number // position in the list, starting at 0
  condition: Condition // the values to show
  errors: string[] // validation messages for this row (can be empty)
  canRemove: boolean // false when this is the only row left
  onChange: (updated: Condition) => void // call this when the operator edits something
  onRemove: () => void // call this when the operator clicks Remove
}

// One rule row, for example: "Product view | at least | 2 | within 7 days".
// It does not keep any data itself. It shows what it is given and reports changes upward.
function ConditionRow({ index, condition, errors, canRemove, onChange, onRemove }: ConditionRowProps) {
  const number = index + 1 // people count from 1, not 0
  const errorId = `condition-${number}-errors`

  // {...condition, count: 5} means: a copy of condition, with count replaced by 5.
  return (
    <fieldset className="condition-row" aria-describedby={errors.length > 0 ? errorId : undefined}>
      <legend>Condition {number}</legend>

      <div className="condition-fields">
        <label>
          Event type
          <select
            value={condition.eventType}
            onChange={(e) => onChange({ ...condition, eventType: e.target.value as EventType })}
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Operator
          <select
            value={condition.operator}
            onChange={(e) => onChange({ ...condition, operator: e.target.value as Operator })}
          >
            {OPERATOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Event count
          <input
            type="number"
            min={0}
            step={1}
            value={condition.count}
            onChange={(e) => onChange({ ...condition, count: Number(e.target.value) })}
          />
        </label>

        <label>
          Within the last (days)
          <input
            type="number"
            min={1}
            step={1}
            value={condition.withinDays}
            onChange={(e) => onChange({ ...condition, withinDays: Number(e.target.value) })}
          />
        </label>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove condition ${number}`}
        >
          Remove
        </button>
      </div>

      {errors.length > 0 && (
        <ul id={errorId} className="field-errors" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}

export default ConditionRow
