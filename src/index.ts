import { promises as fs } from 'fs';
import path from 'path';
import Keyring from './Keyring';
import Server from './Server';
import RpcServer from './RpcServer';

const main = async (): Promise<void> => {
  const keyring = Keyring.fromHID();

  const server = new Server();
  const rpcServer = new RpcServer(server);

  rpcServer.addHandler('get_keys', () => {
    return keyring.getKeys();
  });

  rpcServer.addHandler('create_key', (index: number) => {
    return keyring.createKey(index);
  });

  rpcServer.addHandler('delete_key', (index: number) => {
    return keyring.deleteKey(index);
  });

  await server.listen(8080);
};

main();
