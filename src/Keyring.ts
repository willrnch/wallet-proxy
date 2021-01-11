import { EventEmitter } from 'events';
import { HID } from 'node-hid';
import { IndexOutOfBoundsError } from './errors';

const VENDOR_ID = 0x483;
const PRODUCT_ID = 0xa2ca;

interface Account {
  index: number;
  address: string;
}

class Keyring extends EventEmitter {
  private static HID_PACKET_SIZE = 64;

  private static COMPRESSED_PUBLIC_KEY_SIZE = 33;

  private static CMD = {
    HELLO: 0x0,
    RESET: 0x1,
    CREATE_KEY: 0x2,
    DUMP_KEYS: 0x3,
    DELETE: 0x4,
    SIGN: 0x5
  };

  private static RES = {
    KEY_CREATED: 0x1,
    GET_KEYS: 0x2,
    SIGN: 0x3,
    DONE: 0xFF
  };

  public static fromHID(): Keyring {
    const device = new HID(VENDOR_ID, PRODUCT_ID);
    return new Keyring(device);
  }

  private static assertUint8(index: number): void {
    if (index < 0x00 || index > 0xff) {
      throw new IndexOutOfBoundsError(0x00, 0xff);
    }
  }

  private device: HID;

  public constructor(device: HID) {
    super();
    this.device = device;

    const onData = (data: Buffer) => this.onData(data);
    device.on('data', onData);

    this.once('close', () => {
      device.off('data', onData);
    });
  }

  public async createKey(index: number): Promise<string> {
    Keyring.assertUint8(index);

    return new Promise((resolve) => {
      let address = null;
      this.once('key-created', (buff) => {
        address = `0x${buff.slice(0, Keyring.COMPRESSED_PUBLIC_KEY_SIZE).toString('hex')}`;
      });

      this.once('done', () => {
        resolve(address);
      });

      const buff = Buffer.alloc(Keyring.HID_PACKET_SIZE);
      buff[0] = Keyring.CMD.CREATE_KEY;
      buff[1] = index;
      this.device.write(buff);
    });
  }

  public async deleteKey(index: number): Promise<void> {
    Keyring.assertUint8(index);

    return new Promise((resolve) => {
      this.once('done', () => {
        resolve();
      });

      const buff = Buffer.alloc(Keyring.HID_PACKET_SIZE);
      buff[0] = Keyring.CMD.DELETE;
      buff[1] = index;

      this.device.write(buff);
    });
  }

  public sign(index: number, payload: Buffer): Promise<Buffer> {
    Keyring.assertUint8(index);

    return new Promise<Buffer>((resolve) => {
      const res = [];

      const onSign = (buff: Buffer) => {
        res.push(buff);
      };

      this.on('sign', onSign);
      this.once('done', () => {
        this.off('sign', onSign);

        const signature = Buffer.concat([
          res[0].slice(0, 32),
          res[1].slice(0, 32),
        ]);

        resolve(signature);
      });

      const buff = Buffer.alloc(Keyring.HID_PACKET_SIZE);
      buff[0] = Keyring.CMD.SIGN;
      buff[1] = index;
      payload.copy(buff, 2);

      this.device.write(buff);
    });
  }

  public getKeys(): Promise<Account[]> {
    return new Promise<Account[]>((resolve) => {
      const res: Buffer[] = [];

      const onDumpKeys = (buff: Buffer) => {
        res.push(buff);
      };

      this.on('dump-keys', onDumpKeys);
      this.once('done', () => {
        this.removeListener('dump-keys', onDumpKeys);

        const accounts: Account[] = [];

        res.forEach((buff) => {
          let i = 0;

          while (i < buff.length) {
            const index = buff[i];
            if (index === 0xFF) {
              return;
            }
            i += 1;

            const address = `0x${buff.slice(i, i + Keyring.COMPRESSED_PUBLIC_KEY_SIZE).toString('hex')}`;
            i += Keyring.COMPRESSED_PUBLIC_KEY_SIZE;

            accounts.push({
              index,
              address
            });
          }
        });

        resolve(accounts);
      });

      const buff = Buffer.alloc(Keyring.HID_PACKET_SIZE);
      buff[0] = Keyring.CMD.DUMP_KEYS;
      this.device.write(buff);
    });
  }

  public close(): void {
    this.device.close();
    this.emit('close');
  }

  private onData(data: Buffer) {
    switch (data[0]) {
      case Keyring.RES.KEY_CREATED:
        this.emit('key-created', data.slice(1));
        break;

      case Keyring.RES.GET_KEYS:
        this.emit('dump-keys', data.slice(1));
        break;

      case Keyring.RES.SIGN:
        this.emit('sign', data.slice(1));
        break;

      case Keyring.RES.DONE:
        this.emit('done');
        break;
    }
  }
}

export default Keyring;
