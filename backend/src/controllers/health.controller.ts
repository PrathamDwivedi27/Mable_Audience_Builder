import type { Request, Response } from 'express';
import { STATUS_CODES } from '../utils/http-status.js';
import { MESSAGES } from '../utils/messages.js';

const getHealth = (_req: Request, res: Response) => {
    res.status(STATUS_CODES.OK).json({ status: MESSAGES.HEALTH_OK });
};

export { getHealth };
