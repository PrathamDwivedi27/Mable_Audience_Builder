import type { Request, Response, NextFunction } from 'express';
import AudienceService from '../services/audience.service.js';
import logger from '../utils/logger.js';
import { audiencePreviewSchema } from '../dto/audience-preview.dto.js';
import { STATUS_CODES } from '../utils/http-status.js';
import { ERROR_CODES, MESSAGES } from '../utils/messages.js';
import { buildErrorResponse } from '../utils/error-response.js';

const audienceService = new AudienceService();

const previewAudience = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = audiencePreviewSchema.safeParse(req.body);

        if (!parsed.success) {
            // Log how many problems there were, never the request data.
            logger.warn(`[AudienceController] Invalid preview request (${parsed.error.issues.length} issue(s))`);
            const details = parsed.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            res.status(STATUS_CODES.BAD_REQUEST).json(
                buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, MESSAGES.VALIDATION_FAILED, details),
            );
            return;
        }

        const result = await audienceService.previewAudience(parsed.data);
        res.status(STATUS_CODES.OK).json(result);
    } catch (error) {
        logger.error('previewAudience failed', error);
        next(error);
    }
};

export { previewAudience };
