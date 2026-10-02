import express from 'express';
import bodyParser from 'body-parser';
import logger from './utils/logger.js';



const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const PORT=3000;

const start_and_setup_server = ()=>{
    app.listen(PORT, ()=>{
        logger.info(`Server is running on PORT ${PORT}`);
    })
}

start_and_setup_server();

const handleServerShutdown=async ()=>{
    try {
        logger.info("Shutting down server...");
        logger.info("Server shutdown complete.");
        process.exit(0);
    } catch (error) {
        logger.error("Error during server shutdown:", error);
        process.exit(1);
    }
}

process.on('SIGINT', handleServerShutdown);
process.on('SIGTERM', handleServerShutdown);