export type EventType =
    | 'page_view'
    | 'product_view'
    | 'add_to_cart'
    | 'checkout_started'
    | 'purchase';

export const EVENT_TYPES: EventType[] = [
    'page_view',
    'product_view',
    'add_to_cart',
    'checkout_started',
    'purchase',
];

export interface EventRow {
    id: string; // BIGSERIAL comes back from pg as a string
    anonymous_id: string;
    event_type: EventType;
    occurred_at: Date;
}

const eventTypeList = EVENT_TYPES.map((t) => `'${t}'`).join(', ');

export const EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS events (
    id           BIGSERIAL PRIMARY KEY,
    anonymous_id TEXT        NOT NULL,
    event_type   TEXT        NOT NULL CHECK (event_type IN (${eventTypeList})),
    occurred_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_user_type_time
    ON events (anonymous_id, event_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_events_type_time
    ON events (event_type, occurred_at);
`;
 