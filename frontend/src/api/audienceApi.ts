import { API_BASE_URL } from '../config'
import type { AudienceRequest, AudienceResponse, ErrorDetail } from '../types/audience'

// The error we throw when a request fails.
// "message" is text we can show to the operator.
export class ApiError extends Error {
  code: string
  details: ErrorDetail[]

  constructor(code: string, message: string, details: ErrorDetail[] = []) {
    super(message)
    this.code = code
    this.details = details
  }
}

// Sends the audience definition to the backend and returns the matching users.
// The backend does all the matching. We only send and receive.
export async function previewAudience(request: AudienceRequest): Promise<AudienceResponse> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/v1/audiences/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    // fetch only throws when the server cannot be reached at all.
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check that the backend is running.')
  }

  let body
  try {
    body = await response.json()
  } catch {
    throw new ApiError('UNEXPECTED_RESPONSE', 'The server sent a response we could not read.')
  }

  if (!response.ok) {
    // The backend always sends errors as { error: { code, message, details? } }.
    throw new ApiError(body.error.code, body.error.message, body.error.details ?? [])
  }

  return body
}
