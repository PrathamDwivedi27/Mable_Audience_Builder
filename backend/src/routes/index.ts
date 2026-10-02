import { Router } from 'express';
import audienceRouter from './v1/audience.routes.js';
import { getHealth } from '../controllers/health.controller.js';

const v1Router = Router();

v1Router.get('/health', getHealth);
v1Router.use('/v1', audienceRouter);

export default v1Router;

