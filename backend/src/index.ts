import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import logger from './utils/logger.js';
import { pool } from './db/pool.js';
import { PORT } from './config/server-config.js';
import apiRoutes from './routes/index.js'
import { CORS_ORIGIN } from './config/server-config.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const SERVER_PORT = PORT;

const app = express();


app.use(cors({ origin: CORS_ORIGIN }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(requestLogger);

app.use(apiRoutes);

app.use(errorHandler);

const start_and_setup_server = ()=>{
    app.listen(SERVER_PORT, ()=>{
        logger.info(`Server is running on PORT ${SERVER_PORT}`);
    })
}

start_and_setup_server();

const handleServerShutdown=async ()=>{
    try {
        logger.info("Shutting down server...");
        await pool.end();
        logger.info("Server shutdown complete.");
        process.exit(0);
    } catch (error) {
        logger.error("Error during server shutdown:", error);
        process.exit(1);
    }
}

process.on('SIGINT', handleServerShutdown);
process.on('SIGTERM', handleServerShutdown);
