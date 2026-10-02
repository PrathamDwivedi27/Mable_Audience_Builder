import dotenv from 'dotenv';

dotenv.config();


export const PORT=process.env.PORT;
export const DATABASE_URL=process.env.DATABASE_URL;
// Address of the frontend, allowed to call this API from the browser.
export const CORS_ORIGIN=process.env.CORS_ORIGIN ?? 'http://localhost:5173';
