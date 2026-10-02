import { Router } from 'express';
import { previewAudience } from '../../controllers/audience.controller.js';

const audienceRouter = Router();

audienceRouter.post('/audiences/preview', previewAudience);

export default audienceRouter;
