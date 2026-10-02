import type { ErrorDetail, ErrorResponse } from '../dto/error.dto.js';

// Builds the one error shape used by every error response.
export const buildErrorResponse = (
    code: string,
    message: string,
    details?: ErrorDetail[],
): ErrorResponse => {
    if (details) {
        return { error: { code, message, details } };
    }
    return { error: { code, message } };
};
