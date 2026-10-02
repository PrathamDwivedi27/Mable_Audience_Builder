import type { AudienceResponse, EventType } from '../types/audience'
import { EVENT_TYPE_OPTIONS } from '../types/audience'

interface ResultsTableProps {
  result: AudienceResponse // the answer from the backend
}

// Turns "product_view" into "Product view" for display.
function eventTypeLabel(eventType: EventType): string {
  const option = EVENT_TYPE_OPTIONS.find((item) => item.value === eventType)
  return option ? option.label : eventType
}

// Shows how many users matched, and a table with the evidence for each one.
// It only displays what the backend sent. It does no matching itself.
function ResultsTable({ result }: ResultsTableProps) {
  // asOf looks like "2026-09-29T00:00:00.000Z". The first 10 characters are the date.
  const asOfDate = result.asOf.slice(0, 10)

  return (
    <section className="results" aria-labelledby="results-heading">
      <h2 id="results-heading">Results for "{result.name}"</h2>
      <p>
        As of {asOfDate} (UTC)
      </p>
      <p className="audience-size">
        Audience size: <strong>{result.total}</strong>
      </p>

      {result.total === 0 ? (
        <p className="empty-state">
          No users match this audience. Try lowering a count or widening a time window.
        </p>
      ) : (
        <table>
          <caption>Anonymous users in this audience and why they matched</caption>
          <thead>
            <tr>
              <th scope="col">Anonymous user</th>
              <th scope="col">Evidence (events found in the time window)</th>
            </tr>
          </thead>
          <tbody>
            {result.members.map((member) => (
              <tr key={member.anonymousId}>
                <th scope="row">{member.anonymousId}</th>
                <td>
                  <ul>
                    {member.evidence.map((item, index) => (
                      <li key={index}>
                        {eventTypeLabel(item.eventType)}: {item.observedCount}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default ResultsTable
