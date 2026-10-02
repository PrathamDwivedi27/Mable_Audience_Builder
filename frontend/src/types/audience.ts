// These match the backend request and response shapes.

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'checkout_started'
  | 'purchase'

export type Operator = 'at_least' | 'exactly'

// ---------- Request (what we send) ----------

export interface Condition {
  eventType: EventType
  operator: Operator
  count: number
  withinDays: number
}

export interface AudienceRequest {
  name: string
  asOf: string // ISO date, e.g. "2026-09-29T00:00:00.000Z"
  conditions: Condition[]
}

// ---------- Response (what we get back) ----------

export interface Evidence {
  eventType: EventType
  observedCount: number
}

export interface AudienceMember {
  anonymousId: string
  evidence: Evidence[]
}

export interface AudienceResponse {
  name: string
  asOf: string
  total: number
  members: AudienceMember[]
}

// ---------- Error body (what the backend sends when something is wrong) ----------

export interface ErrorDetail {
  field: string // e.g. "conditions.0.count"
  message: string
}

// ---------- Options for the dropdowns ----------

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'page_view', label: 'Page view' },
  { value: 'product_view', label: 'Product view' },
  { value: 'add_to_cart', label: 'Add to cart' },
  { value: 'checkout_started', label: 'Checkout started' },
  { value: 'purchase', label: 'Purchase' },
]

export const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: 'at_least', label: 'at least' },
  { value: 'exactly', label: 'exactly' },
]
