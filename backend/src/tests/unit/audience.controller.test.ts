import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { previewAudience } from '../../controllers/audience.controller.js';

// Fake service: the controller gets this instead of the real one.
const { servicePreview } = vi.hoisted(() => ({ servicePreview: vi.fn() }));

vi.mock('../../services/audience.service.js', () => ({
    default: class {
        previewAudience = servicePreview;
    },
}));

vi.mock('../../utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const validBody = {
    name: 'Viewed but not purchased',
    asOf: '2026-09-29T00:00:00.000Z',
    conditions: [{ eventType: 'product_view', operator: 'at_least', count: 2, withinDays: 7 }],
};

// A fake response where status() returns itself, so res.status(400).json(...) works.
const fakeResponse = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

describe('previewAudience controller', () => {
    beforeEach(() => {
        servicePreview.mockReset();
    });

    it('returns 200 with the service result for a valid request', async () => {
        const serviceResult = { name: 'Viewed but not purchased', asOf: validBody.asOf, total: 0, members: [] };
        servicePreview.mockResolvedValue(serviceResult);
        const res = fakeResponse();
        const next = vi.fn();

        await previewAudience({ body: validBody } as Request, res as unknown as Response, next);

        expect(servicePreview).toHaveBeenCalledWith(validBody);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(serviceResult);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 with a consistent error body for an invalid request', async () => {
        const res = fakeResponse();
        const next = vi.fn();
        const body = {
            ...validBody,
            conditions: [{ eventType: 'login', operator: 'at_least', count: -1, withinDays: 7 }],
        };

        await previewAudience({ body } as Request, res as unknown as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'The audience definition is invalid',
                details: [
                    { field: 'conditions.0.eventType', message: expect.any(String) },
                    { field: 'conditions.0.count', message: expect.any(String) },
                ],
            },
        });
    });

    it('does not call the service when the request is invalid', async () => {
        const res = fakeResponse();

        await previewAudience({ body: {} } as Request, res as unknown as Response, vi.fn());

        expect(servicePreview).not.toHaveBeenCalled();
    });

    it('passes unexpected service errors to next() instead of responding itself', async () => {
        const error = new Error('database is down');
        servicePreview.mockRejectedValue(error);
        const res = fakeResponse();
        const next = vi.fn();

        await previewAudience({ body: validBody } as Request, res as unknown as Response, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });
});
