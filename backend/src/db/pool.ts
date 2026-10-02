import pg from 'pg';
import { DATABASE_URL } from '../config/server-config.js';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });
