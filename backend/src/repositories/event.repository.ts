import { pool } from '../db/pool.js';
import type { EventType } from '../models/event.model.js';

export interface UserEventCount {
    anonymousId: string;
    count: number;
}

// Every anonymous user that has at least one event.
// Needed so rules like "purchase exactly 0" can include users with no purchases.
export async function findAllAnonymousIds(): Promise<string[]> {
    const result = await pool.query('SELECT DISTINCT anonymous_id FROM events');
    return result.rows.map((row) => row.anonymous_id);
}

// How many events of one type each user has inside the time window.
// Window: after windowStart, up to and including windowEnd.
// Users with zero matching events are not returned.
export async function countEventsByUser(
    eventType: EventType,
    windowStart: Date,
    windowEnd: Date,
): Promise<UserEventCount[]> {
    const result = await pool.query(
        `SELECT anonymous_id, COUNT(*)::int AS count
         FROM events
         WHERE event_type = $1
           AND occurred_at > $2
           AND occurred_at <= $3
         GROUP BY anonymous_id`,
        [eventType, windowStart, windowEnd],
    );
    return result.rows.map((row) => ({
        anonymousId: row.anonymous_id,
        count: row.count,
    }));
}
