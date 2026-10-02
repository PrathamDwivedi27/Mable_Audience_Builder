import { pool } from './pool.js';
import type { EventType } from '../models/event.model.js';

// Reference date the seed data is built around. Use this as `asOf` in previews.
export const SEED_AS_OF = new Date('2026-09-29T00:00:00.000Z');

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const DAY = 24 * HOUR;

// A moment `days` before asOf, shifted by `plusMs` (positive = later).
const daysAgo = (days: number, plusMs = 0): Date =>
    new Date(SEED_AS_OF.getTime() - days * DAY + plusMs);

interface SeedEvent {
    anonymousId: string;
    eventType: EventType;
    occurredAt: Date;
}

const events: SeedEvent[] = [];

const add = (anonymousId: string, eventType: EventType, ...times: Date[]): void => {
    for (const occurredAt of times) {
        events.push({ anonymousId, eventType, occurredAt });
    }
};

// ---- Clear matches for "product_view >= 2 AND purchase = 0" in 7 days ----
add('anon_match_basic', 'page_view', daysAgo(1));
add('anon_match_basic', 'product_view', daysAgo(1), daysAgo(2), daysAgo(3));

add('anon_heavy_viewer', 'product_view', ...[0.5, 1, 1.5, 2, 3, 4].map((d) => daysAgo(d)));
add('anon_heavy_viewer', 'purchase', daysAgo(8)); // purchase is outside the window

add('anon_old_purchase', 'product_view', daysAgo(1), daysAgo(4));
add('anon_old_purchase', 'purchase', daysAgo(10)); // purchase is outside the window

// ---- Boundary on the count: exactly 2 views (at_least 2 passes) ----
add('anon_exactly_two_views', 'product_view', daysAgo(2), daysAgo(5));

// ---- Clear non-matches ----
add('anon_one_view', 'product_view', daysAgo(2)); // too few views
add('anon_viewed_and_bought', 'product_view', daysAgo(1), daysAgo(2));
add('anon_viewed_and_bought', 'purchase', daysAgo(3)); // purchased in window
add('anon_old_views', 'product_view', daysAgo(8), daysAgo(9), daysAgo(12)); // all too old
add('anon_inactive', 'page_view', daysAgo(20)); // exists, but no relevant events

// ---- Boundaries on the time window (7 days before asOf) ----
add('anon_edge_window_start', 'product_view', daysAgo(7), daysAgo(7)); // exactly asOf - 7d
add('anon_edge_just_outside', 'product_view', daysAgo(7, -SECOND), daysAgo(7, -SECOND)); // 1s before start
add('anon_edge_just_inside', 'product_view', daysAgo(7, SECOND), daysAgo(7, SECOND)); // 1s after start
add('anon_edge_window_end', 'product_view', daysAgo(0), daysAgo(0)); // exactly asOf
add('anon_future_events', 'product_view', daysAgo(0, HOUR), daysAgo(0, 2 * HOUR)); // after asOf

// ---- Funnel users, handy for other rules (add_to_cart, checkout_started) ----
add('anon_funnel_abandoned', 'page_view', daysAgo(2));
add('anon_funnel_abandoned', 'product_view', daysAgo(2));
add('anon_funnel_abandoned', 'add_to_cart', daysAgo(2));
add('anon_funnel_abandoned', 'checkout_started', daysAgo(1)); // never purchased

add('anon_buyer', 'page_view', daysAgo(3));
add('anon_buyer', 'product_view', daysAgo(3));
add('anon_buyer', 'add_to_cart', daysAgo(3));
add('anon_buyer', 'checkout_started', daysAgo(3));
add('anon_buyer', 'purchase', daysAgo(2));

// Clears the table and inserts the fixed dataset, so it is safe to re-run.
export const seed = async (): Promise<number> => {
    await pool.query('TRUNCATE TABLE events RESTART IDENTITY');
    await pool.query(
        `INSERT INTO events (anonymous_id, event_type, occurred_at)
         SELECT * FROM unnest($1::text[], $2::text[], $3::timestamptz[])`,
        [
            events.map((e) => e.anonymousId),
            events.map((e) => e.eventType),
            events.map((e) => e.occurredAt),
        ],
    );
    return events.length;
};
