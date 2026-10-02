import { useState } from 'react'
import type { FormEvent } from 'react'
import ConditionRow from './components/ConditionRow'
import ResultsTable from './components/ResultsTable'
import { ApiError, previewAudience } from './api/audienceApi'
import { friendlyMessage } from './utils/friendlyMessage'
import type { AudienceResponse, Condition } from './types/audience'

// The sample data in the database is built around this date.
const DEFAULT_AS_OF_DATE = '2026-09-29'

// The example audience from the assignment: viewed a product twice or more, but did not purchase.
const DEFAULT_CONDITIONS: Condition[] = [
  { eventType: 'product_view', operator: 'at_least', count: 2, withinDays: 7 },
  { eventType: 'purchase', operator: 'exactly', count: 0, withinDays: 7 },
]

function App() {
  // ---- State: the data this screen remembers ----
  const [name, setName] = useState('Viewed but not purchased')
  const [asOfDate, setAsOfDate] = useState(DEFAULT_AS_OF_DATE)
  const [conditions, setConditions] = useState<Condition[]>(DEFAULT_CONDITIONS)
  const [result, setResult] = useState<AudienceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  // ---- Editing the conditions ----
  function handleConditionChange(index: number, updated: Condition) {
    setConditions(conditions.map((condition, i) => (i === index ? updated : condition)))
  }

  function handleRemoveCondition(index: number) {
    setConditions(conditions.filter((_condition, i) => i !== index))
  }

  function handleAddCondition() {
    const newCondition: Condition = { eventType: 'product_view', operator: 'at_least', count: 1, withinDays: 7 }
    setConditions([...conditions, newCondition])
  }

  // ---- Asking the backend ----
  async function runPreview() {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await previewAudience({
        name,
        asOf: `${asOfDate}T00:00:00.000Z`,
        conditions,
      })
      setResult(data)
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught)
      } else {
        setError(new ApiError('UNKNOWN', 'Something went wrong. Please try again.'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Runs when the form is submitted (button click, or Enter key).
  function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser from reloading the page
    runPreview()
  }

  // ---- Sorting out the error, for display ----
  const isValidationError = error !== null && error.code === 'VALIDATION_ERROR'
  const isOtherError = error !== null && !isValidationError
  const details = isValidationError ? error.details : []

  const nameErrors = details.filter((d) => d.field === 'name').map(friendlyMessage)
  const asOfErrors = details.filter((d) => d.field === 'asOf').map(friendlyMessage)
  const conditionsErrors = details.filter((d) => d.field === 'conditions').map(friendlyMessage)

  // Messages for the condition at this position, e.g. fields starting with "conditions.0."
  function errorsForCondition(index: number): string[] {
    return details.filter((d) => d.field.startsWith(`conditions.${index}.`)).map(friendlyMessage)
  }

  return (
    <main>
      <h1>Audience Builder</h1>
      <p>Define who belongs in an audience, then preview the matching anonymous users.</p>

      <form onSubmit={handleSubmit}>
        <label>
          Audience name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameErrors.length > 0}
            aria-describedby={nameErrors.length > 0 ? 'name-errors' : undefined}
          />
        </label>
        {nameErrors.length > 0 && (
          <p id="name-errors" className="field-errors" role="alert">
            {nameErrors[0]}
          </p>
        )}

        <label>
          As of date
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            aria-invalid={asOfErrors.length > 0}
            aria-describedby="as-of-hint"
          />
        </label>
        <p id="as-of-hint" className="hint">
          "Last 7 days" is counted back from this date, not from today. The sample data is built around
          2026-09-29.
        </p>
        {asOfErrors.length > 0 && (
          <p className="field-errors" role="alert">
            {asOfErrors[0]}
          </p>
        )}

        <h2>Conditions</h2>
        <p className="hint">A user must meet all of these conditions.</p>

        {conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            index={index}
            condition={condition}
            errors={errorsForCondition(index)}
            canRemove={conditions.length > 1}
            onChange={(updated) => handleConditionChange(index, updated)}
            onRemove={() => handleRemoveCondition(index)}
          />
        ))}

        {conditionsErrors.length > 0 && (
          <p className="field-errors" role="alert">
            {conditionsErrors[0]}
          </p>
        )}

        <div className="form-actions">
          <button type="button" onClick={handleAddCondition}>
            Add condition
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Preview audience'}
          </button>
        </div>
      </form>

      {/* This area changes after each preview. aria-live lets screen readers announce the change. */}
      <div aria-live="polite">
        {isLoading && <p className="status">Loading the audience...</p>}

        {isValidationError && (
          <p className="error-banner" role="alert">
            Please fix the problems shown above and try again.
          </p>
        )}

        {isOtherError && (
          <div className="error-banner" role="alert">
            <p>{error.message}</p>
            <button type="button" onClick={runPreview}>
              Try again
            </button>
          </div>
        )}

        {result !== null && <ResultsTable result={result} />}
      </div>
    </main>
  )
}

export default App
