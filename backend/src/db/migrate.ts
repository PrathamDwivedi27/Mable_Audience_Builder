import { pool } from './pool.js';
import { EVENTS_TABLE_SQL } from '../models/event.model.js';

export const migrate = async (): Promise<void> => {
    await pool.query(EVENTS_TABLE_SQL);
};
