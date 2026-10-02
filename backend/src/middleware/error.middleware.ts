import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { STATUS_CODES } from '../utils/http-status.js';
import { ERROR_CODES, MESSAGES } from '../utils/messages.js';
import { buildErrorResponse } from '../utils/error-response.js';

// Catches every error passed to next(error).
// Express needs all 4 parameters here, even the unused ones.
const errorHandler = (error: any, _req: Request, res: Response, _next: NextFunction) => {
    // body-parser sets this type when the JSON body cannot be parsed.
    if (error?.type === 'entity.parse.failed') {
        logger.warn('[ErrorMiddleware] Request body is not valid JSON');
        res.status(STATUS_CODES.BAD_REQUEST).json(
            buildErrorResponse(ERROR_CODES.INVALID_JSON, MESSAGES.INVALID_JSON),
        );
        return;
    }

    logger.error('[ErrorMiddleware] Unhandled error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(
        buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, MESSAGES.INTERNAL_ERROR),
    );
};

export { errorHandler };
