import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// Logs one line per request: method, path, status and time taken.
// The request body is never logged.
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info(`[Request] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });

    next();
};

export { requestLogger };
