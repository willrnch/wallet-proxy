import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
});

const options: winston.transports.ConsoleTransportOptions = {};

if (process.env.NODE_ENV !== 'production') {
  options.format = winston.format.simple();
}

logger.add(new winston.transports.Console(options));

export default logger;