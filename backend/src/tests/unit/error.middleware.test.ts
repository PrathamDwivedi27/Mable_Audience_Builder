import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../../middleware/error.middleware.js';

vi.mock('../../utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const fakeResponse = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

const callErrorHandler = (error: unknown) => {
    const res = fakeResponse();
    errorHandler(error, {} as Request, res as unknown as Response, vi.fn());
    return res;
};

describe('errorHandler', () => {
    it('returns 400 INVALID_JSON when the body could not be parsed', () => {
        // body-parser marks bad JSON with this type.
        const res = callErrorHandler({ type: 'entity.parse.failed' });

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
        });
    });

    it('returns 500 INTERNAL_ERROR for any other error', () => {
        const res = callErrorHandler(new Error('something broke'));

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again' },
        });
    });

    it('does not leak the internal error message to the client', () => {
        const res = callErrorHandler(new Error('password=secret at db host'));

        const sentBody = JSON.stringify(res.json.mock.calls[0]![0]);
        expect(sentBody).not.toContain('secret');
    });
});
