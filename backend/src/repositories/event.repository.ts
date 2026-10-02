import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';
import type { EventType } from '../models/event.model.js';

// One rule, with its time window already worked out by the service.
export interface ConditionQuery {
    eventType: EventType;
    operator: 'at_least' | 'exactly';
    count: number;
    windowStart: Date;
    windowEnd: Date;
}

// A user who passed every condition.
// counts[i] is how many events they had for conditions[i].
export interface MatchedUser {
    anonymousId: string;
    counts: number[];
}

// The only SQL text we add ourselves. Everything else goes through $1, $2... placeholders.
const SQL_OPERATORS = {
    at_least: '>=',
    exactly: '=',
};

class EventRepository {

    // Finds every user who passes ALL conditions, using a single query.
    // Window for each condition: after windowStart, up to and including windowEnd.
    // Users are anyone with at least one event, so "purchase exactly 0" can match them.
    async findMatchingUsers(conditions: ConditionQuery[]): Promise<MatchedUser[]> {
        try {
            logger.debug(`[EventRepository] Finding users matching ${conditions.length} condition(s)`);

            const values: (string | number | Date)[] = [];
            const countColumns: string[] = [];
            const passChecks: string[] = [];

            conditions.forEach((condition, index) => {
                const first = index * 4;
                values.push(
                    condition.eventType,
                    condition.windowStart,
                    condition.windowEnd,
                    condition.count,
                );

                // Counts this user's events for this condition only.
                countColumns.push(
                    `COUNT(*) FILTER (
                        WHERE event_type = $${first + 1}
                          AND occurred_at > $${first + 2}
                          AND occurred_at <= $${first + 3}
                    )::int AS count_${index}`,
                );

                passChecks.push(`count_${index} ${SQL_OPERATORS[condition.operator]} $${first + 4}`);
            });

            const result = await pool.query(
                `SELECT *
                 FROM (
                     SELECT anonymous_id, ${countColumns.join(', ')}
                     FROM events
                     GROUP BY anonymous_id
                 ) AS user_counts
                 WHERE ${passChecks.join(' AND ')}
                 ORDER BY anonymous_id`,
                values,
            );

            return result.rows.map((row) => ({
                anonymousId: row.anonymous_id,
                counts: conditions.map((_condition, index) => row[`count_${index}`]),
            }));
        } catch (error) {
            logger.error('[EventRepository] Error finding matching users:', error);
            throw error;
        }
    }
}

export default EventRepository;
