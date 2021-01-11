import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import Server from './Server';
import RpcError from './RpcError';

type Callback = (...params: unknown[]) => Promise<unknown>;

const cors = (req: Request, res: Response, next: NextFunction): void => {
  const accessControlRequestHeaders = req.headers['access-control-request-headers'];
  if (accessControlRequestHeaders) {
    res.set('Access-Control-Allow-Headers', accessControlRequestHeaders);
  }

  const accessControlRequestMethod = req.headers['access-control-request-method'];
  if (accessControlRequestMethod) {
    res.set('Access-Control-Allow-Methods', accessControlRequestMethod);
  }

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'no-store');
  res.set('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT');

  next();
};

class RpcServer {
  private static VERSION = '2.0';

  private handlers = new Map<string, Callback>();

  public constructor(server: Server) {
    server.expressApp.options(
      '/',
      cors,
      (req: Request, res: Response) => {
        res.status(204);
        res.end();
      }
    );

    server.expressApp.post(
      '/',
      cors,
      bodyParser.json(),
      (req: Request, res: Response, next: NextFunction) => {
        this.handleRequest(req, res, next);
      }
    );
  }

  public addHandler(method: string, callback: Callback) {
    this.handlers.set(method, callback);
  }

  private async handleRequest(req: Request, res: Response, next: NextFunction) {
    const { method, params, id } = req.body;
    const handler = this.handlers.get(method);

    if (!handler) {
      res.json({
        jsonrpc: RpcServer.VERSION,
        id,
        error: new RpcError(-32601, 'Method not found'),
      });
      return
    }

    try {
      const result = await handler(...params);
        res.json({
          jsonrpc: RpcServer.VERSION,
          id,
          result,
        });
    } catch (error) {
      if (error instanceof RpcError) {
        res.json({
          jsonrpc: RpcServer.VERSION,
          id,
          error,
        });
      } else {
        next(error);
      }
    }
  }
}

export default RpcServer;
