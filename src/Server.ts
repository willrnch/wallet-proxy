import http from 'http';
import express, { Express } from 'express';
import logger from './logger';

class Server {
  public readonly expressApp: Express;

  constructor() {
    this.expressApp = express();
  }

  public listen(port: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const httpServer = http.createServer();

      httpServer.on('request', this.expressApp);

      const listenCb = (): void => {
        const addr = httpServer.address();
  
        if (addr && typeof addr !== 'string') {
          let host: string;
          if (addr.family === 'IPv6') {
            host = `[${addr.address}]:${addr.port}`;
          } else {
            host = `${addr.address}:${addr.port}`;
          }

          const uri = `http://${host}`;
          logger.info(`Serving at ${uri}"`);
        }

        httpServer.on('close', resolve);
      };
  
      httpServer.listen({ port }, listenCb);
    });
  }
}

export default Server;
