import { describe, it, expect, afterAll, vi } from 'vitest';
import AudienceService from '../../services/audience.service.js';
import { pool } from '../../db/pool.js';
import type { Condition } from '../../dto/audience-preview.dto.js';

// These tests run the real SQL against the seeded database.
// The seed data is built around this date. Run `npm run db:setup` first (npm run test:integration does it).
const SEED_AS_OF = '2026-09-29T00:00:00.000Z';

vi.mock('../../utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const service = new AudienceService();

// Runs a preview and returns only the matching user ids.
const previewIds = async (conditions: Condition[], asOf = SEED_AS_OF): Promise<string[]> => {
    const result = await service.previewAudience({ name: 'test', asOf, conditions });
    return result.members.map((member) => member.anonymousId);
};

const views = (operator: 'at_least' | 'exactly', count: number, withinDays = 7): Condition => ({
    eventType: 'product_view',
    operator,
    count,
    withinDays,
});

const noPurchase: Condition = { eventType: 'purchase', operator: 'exactly', count: 0, withinDays: 7 };

describe('audience query (real database)', () => {
    afterAll(async () => {
        await pool.end();
    });

    it('finds users who viewed at least twice but did not purchase (the assignment example)', async () => {
        const result = await service.previewAudience({
            name: 'Viewed but not purchased',
            asOf: SEED_AS_OF,
            conditions: [views('at_least', 2), noPurchase],
        });

        expect(result.total).toBe(6);
        expect(result.members.map((m) => m.anonymousId)).toEqual([
            'anon_edge_just_inside',
            'anon_edge_window_end',
            'anon_exactly_two_views',
            'anon_heavy_viewer',
            'anon_match_basic',
            'anon_old_purchase',
        ]);
    });

    it('returns the observed count of each condition as evidence', async () => {
        const result = await service.previewAudience({
            name: 'test',
            asOf: SEED_AS_OF,
            conditions: [views('at_least', 2), noPurchase],
        });

        const heavyViewer = result.members.find((m) => m.anonymousId === 'anon_heavy_viewer');
        expect(heavyViewer?.evidence).toEqual([
            { eventType: 'product_view', observedCount: 6 },
            { eventType: 'purchase', observedCount: 0 },
        ]);
    });

    describe('operators', () => {
        it('at_least includes the exact boundary count', async () => {
            const atLeastTwo = await previewIds([views('at_least', 2)]);
            const atLeastThree = await previewIds([views('at_least', 3)]);

            expect(atLeastTwo).toContain('anon_exactly_two_views'); // has exactly 2
            expect(atLeastThree).not.toContain('anon_exactly_two_views');
            expect(atLeastThree).toContain('anon_match_basic'); // has 3
        });

        it('exactly matches only the exact count', async () => {
            const exactlyOne = await previewIds([views('exactly', 1)]);

            expect(exactlyOne).toContain('anon_one_view');
            expect(exactlyOne).not.toContain('anon_exactly_two_views'); // has 2
            expect(exactlyOne).not.toContain('anon_heavy_viewer'); // has 6
        });

        it('exactly 0 includes users who have no events of that type at all', async () => {
            const ids = await previewIds([noPurchase]);

            expect(ids).toContain('anon_inactive'); // only has an old page_view
            expect(ids).not.toContain('anon_buyer');
            expect(ids).not.toContain('anon_viewed_and_bought');
        });
    });

    describe('time window', () => {
        it('does not count an event exactly at the window start', async () => {
            const ids = await previewIds([views('at_least', 2)]);

            expect(ids).not.toContain('anon_edge_window_start'); // exactly asOf - 7 days
            expect(ids).not.toContain('anon_edge_just_outside'); // 1 second before the start
            expect(ids).toContain('anon_edge_just_inside'); // 1 second after the start
        });

        it('counts an event exactly at asOf, but not events after it', async () => {
            const ids = await previewIds([views('at_least', 2)]);

            expect(ids).toContain('anon_edge_window_end'); // exactly asOf
            expect(ids).not.toContain('anon_future_events'); // after asOf
        });

        it('ignores a purchase that is outside the window', async () => {
            const ids = await previewIds([views('at_least', 2), noPurchase]);

            expect(ids).toContain('anon_old_purchase'); // bought 10 days ago
            expect(ids).not.toContain('anon_viewed_and_bought'); // bought 3 days ago
        });

        it('gives different results for a different asOf', async () => {
            // Weeks later, none of the seeded views fall inside the 7 day window.
            const ids = await previewIds([views('at_least', 2)], '2026-10-20T00:00:00.000Z');

            expect(ids).toEqual([]);
        });

        it('lets each condition use its own window', async () => {
            // Purchased 10 days ago: outside a 7 day window, inside a 14 day window.
            const sevenDays = await previewIds([
                { eventType: 'purchase', operator: 'at_least', count: 1, withinDays: 7 },
            ]);
            const fourteenDays = await previewIds([
                { eventType: 'purchase', operator: 'at_least', count: 1, withinDays: 14 },
            ]);

            expect(sevenDays).not.toContain('anon_old_purchase');
            expect(fourteenDays).toContain('anon_old_purchase');
        });
    });

    it('requires every condition to be met (AND)', async () => {
        const ids = await previewIds([
            { eventType: 'add_to_cart', operator: 'at_least', count: 1, withinDays: 7 },
            { eventType: 'checkout_started', operator: 'at_least', count: 1, withinDays: 7 },
            noPurchase,
        ]);

        expect(ids).toEqual(['anon_funnel_abandoned']);
    });
});
