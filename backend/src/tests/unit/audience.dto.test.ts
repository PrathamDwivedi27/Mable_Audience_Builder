import { describe, it, expect } from 'vitest';
import { audiencePreviewSchema } from '../../dto/audience-preview.dto.js';

const validCondition = {
    eventType: 'product_view',
    operator: 'at_least',
    count: 2,
    withinDays: 7,
};

const validBody = {
    name: 'Viewed but not purchased',
    asOf: '2026-09-29T00:00:00.000Z',
    conditions: [validCondition],
};

// Returns the fields that failed validation, e.g. ['conditions.0.count'].
const failedFields = (body: unknown): string[] => {
    const result = audiencePreviewSchema.safeParse(body);
    if (result.success) {
        return [];
    }
    return result.error.issues.map((issue) => issue.path.join('.'));
};

describe('audiencePreviewSchema', () => {
    it('accepts a valid request', () => {
        const result = audiencePreviewSchema.safeParse(validBody);

        expect(result.success).toBe(true);
    });

    it('accepts count 0 (used for "did not do this")', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, operator: 'exactly', count: 0 }] };

        expect(failedFields(body)).toEqual([]);
    });

    it('rejects an empty body, listing every missing field', () => {
        expect(failedFields({})).toEqual(['name', 'asOf', 'conditions']);
    });

    it('rejects a blank name', () => {
        expect(failedFields({ ...validBody, name: '   ' })).toEqual(['name']);
    });

    it('rejects an asOf that is not an ISO date', () => {
        expect(failedFields({ ...validBody, asOf: 'yesterday' })).toEqual(['asOf']);
    });

    it('rejects an empty conditions list', () => {
        expect(failedFields({ ...validBody, conditions: [] })).toEqual(['conditions']);
    });

    it('rejects an unknown event type', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, eventType: 'login' }] };

        expect(failedFields(body)).toEqual(['conditions.0.eventType']);
    });

    it('rejects an unknown operator', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, operator: 'more_than' }] };

        expect(failedFields(body)).toEqual(['conditions.0.operator']);
    });

    it('rejects a negative count', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, count: -1 }] };

        expect(failedFields(body)).toEqual(['conditions.0.count']);
    });

    it('rejects a count that is not a whole number', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, count: 1.5 }] };

        expect(failedFields(body)).toEqual(['conditions.0.count']);
    });

    it('rejects withinDays of 0', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, withinDays: 0 }] };

        expect(failedFields(body)).toEqual(['conditions.0.withinDays']);
    });

    it('rejects a huge withinDays that would break the date maths', () => {
        const body = { ...validBody, conditions: [{ ...validCondition, withinDays: 9000000000000000 }] };

        expect(failedFields(body)).toEqual(['conditions.0.withinDays']);
    });

    it('points at the right condition when the second one is invalid', () => {
        const body = { ...validBody, conditions: [validCondition, { ...validCondition, count: -5 }] };

        expect(failedFields(body)).toEqual(['conditions.1.count']);
    });
});
