import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AudienceService from '../../services/audience.service.js';

// Fake repository: the service gets this instead of the real one, so no database is used.
const { findMatchingUsers } = vi.hoisted(() => ({ findMatchingUsers: vi.fn() }));

vi.mock('../../repositories/event.repository.js', () => ({
    default: class {
        findMatchingUsers = findMatchingUsers;
    },
}));

// Keep test output clean and avoid writing to the log files.
vi.mock('../../utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const AS_OF = '2026-09-29T00:00:00.000Z';

const request = {
    name: 'Viewed but not purchased',
    asOf: AS_OF,
    conditions: [
        { eventType: 'product_view' as const, operator: 'at_least' as const, count: 2, withinDays: 7 },
        { eventType: 'purchase' as const, operator: 'exactly' as const, count: 0, withinDays: 7 },
    ],
};

describe('AudienceService.previewAudience', () => {
    let service: AudienceService;

    beforeEach(() => {
        findMatchingUsers.mockReset();
        findMatchingUsers.mockResolvedValue([]);
        service = new AudienceService();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('asks the repository for each condition, with the time window worked out from asOf', async () => {
        await service.previewAudience(request);

        expect(findMatchingUsers).toHaveBeenCalledTimes(1);
        expect(findMatchingUsers).toHaveBeenCalledWith([
            {
                eventType: 'product_view',
                operator: 'at_least',
                count: 2,
                windowStart: new Date('2026-09-22T00:00:00.000Z'), // asOf - 7 days
                windowEnd: new Date(AS_OF),
            },
            {
                eventType: 'purchase',
                operator: 'exactly',
                count: 0,
                windowStart: new Date('2026-09-22T00:00:00.000Z'),
                windowEnd: new Date(AS_OF),
            },
        ]);
    });

    it('gives each condition its own time window', async () => {
        await service.previewAudience({
            ...request,
            conditions: [
                { eventType: 'product_view', operator: 'at_least', count: 1, withinDays: 7 },
                { eventType: 'purchase', operator: 'at_least', count: 1, withinDays: 14 },
            ],
        });

        const queries = findMatchingUsers.mock.calls[0]![0];
        expect(queries[0].windowStart).toEqual(new Date('2026-09-22T00:00:00.000Z'));
        expect(queries[1].windowStart).toEqual(new Date('2026-09-15T00:00:00.000Z'));
    });

    it('uses asOf from the request and never the current clock', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

        await service.previewAudience(request);

        const queries = findMatchingUsers.mock.calls[0]![0];
        expect(queries[0].windowEnd).toEqual(new Date(AS_OF));
        expect(queries[0].windowStart).toEqual(new Date('2026-09-22T00:00:00.000Z'));
    });

    it('builds the evidence from the counts, in the same order as the conditions', async () => {
        findMatchingUsers.mockResolvedValue([
            { anonymousId: 'anon_a', counts: [3, 0] },
            { anonymousId: 'anon_b', counts: [6, 0] },
        ]);

        const result = await service.previewAudience(request);

        expect(result.members).toEqual([
            {
                anonymousId: 'anon_a',
                evidence: [
                    { eventType: 'product_view', observedCount: 3 },
                    { eventType: 'purchase', observedCount: 0 },
                ],
            },
            {
                anonymousId: 'anon_b',
                evidence: [
                    { eventType: 'product_view', observedCount: 6 },
                    { eventType: 'purchase', observedCount: 0 },
                ],
            },
        ]);
    });

    it('returns the name, asOf and the audience size', async () => {
        findMatchingUsers.mockResolvedValue([
            { anonymousId: 'anon_a', counts: [3, 0] },
            { anonymousId: 'anon_b', counts: [6, 0] },
        ]);

        const result = await service.previewAudience(request);

        expect(result.name).toBe('Viewed but not purchased');
        expect(result.asOf).toBe(AS_OF);
        expect(result.total).toBe(2);
    });

    it('returns an empty audience when nobody matches', async () => {
        const result = await service.previewAudience(request);

        expect(result.total).toBe(0);
        expect(result.members).toEqual([]);
    });

    it('passes repository errors up to the caller', async () => {
        findMatchingUsers.mockRejectedValue(new Error('database is down'));

        await expect(service.previewAudience(request)).rejects.toThrow('database is down');
    });
});
