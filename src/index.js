import createDocument, { assertDocument } from './document';
import {
    generateRandomString,
    generateDid,
    parseDid,
    pemToBuffer,
} from './utils';
import { UnavailableIpfs, InvalidDid, IllegalCreate } from './utils/errors';
import last from 'it-last';
import goPush from './utils/ipnsUtils';

class Ipid {
  #ipfs;
  #lifetime;
  #apiMultiAddr;
  #wsMultiAddr;

  constructor(ipfs, lifetime, apiMultiAddr, wsMultiAddr) {
      this.#ipfs = ipfs;
      this.#lifetime = lifetime || '87600h';
      this.#apiMultiAddr = apiMultiAddr;
      this.#wsMultiAddr = wsMultiAddr;
  }

  async resolve(did) {
      const { identifier } = parseDid(did);

      try {
          const path = await last(this.#ipfs.name.resolve(identifier));
          const cidStr = path.replace(/^\/ipfs\//, '');

          const { value: content } = await this.#ipfs.dag.get(cidStr);

          assertDocument(content);

          return content;
      } catch (err) {
          console.log('resolve err:', err);
          if (err.code === 'INVALID_DOCUMENT') {
              throw err;
          }

          throw new InvalidDid(did, `Unable to resolve document with DID: ${did}`, {
              originalError: err.message,
          });
      }
  }

  async create(pem, operations) {
      const did = await getDid(pem);

      const document = createDocument(did);

      operations(document);

      return this.#publish(pem, document.getContent());
  }

  async update(pem, operations) {
      const did = await getDid(pem);

      const content = await this.resolve(did);
      const document = createDocument(did, content);

      operations(document);

      return this.#publish(pem, document.getContent());
  }

  #publish = async (pem, content) => {
      const keyName = this.#generateKeyName();
      const start = Date.now();

      await this.#importKey(keyName, pem);

      try {
          const cid = await this.#ipfs.dag.put(content, { pin: true });
          const path = `/ipfs/${cid.toBaseEncodedString()}`;

          console.log(
              'publishing',
              content,
        ` to ${path} ${new Date(start).toLocaleTimeString()}`
          );

          this.#ipfs.name
          .publish(path, {
              resolve: false,
              key: keyName,
          })
          .then((resLocal) => {
              console.log(
            `published ${resLocal.value} to  ${resLocal.name} ended: ${
              Date.now() - start
            }`
              );
          })
          .catch((error) => {
              console.log(error);
          });

          // Push it to the goIpfs node network
          console.log(`this.#apiMultiAddr, this.#wsMultiAddr, cid`,this.#apiMultiAddr, this.#wsMultiAddr, cid)
          goPush(pem, this.#apiMultiAddr, this.#wsMultiAddr, cid)
          .then(() => {
              console.log(
            `published to go ${Date.now() - start}ms`
              );
          })
          .catch((error) => {
              console.log(error);
          });

          return content;
      } catch (err) {
          console.log(err);
      } finally {
          await this.#removeKey(keyName);
      }
  };

  #removeKey = async (keyName) => {
      const keysList = await this.#ipfs.key.list();
      const hasKey = keysList.some(({ name }) => name === keyName);

      if (!hasKey) {
          return;
      }

      await this.#ipfs.key.rm(keyName);
  };

  #importKey = async (keyName, pem, password) => {
      await this.#removeKey(keyName);

      await this.#ipfs.key.import(keyName, pem, password);
  };

  #generateKeyName = () => `js-ipid-${generateRandomString()}`;
}

export const getDid = async (pem) => {
    const key = await pemToBuffer(pem);

    return generateDid(key);
};

const createDidIpid = (ipfs, { lifetime } = {}, apiMultiAddr, wsMultiAddr) => {
    if (typeof ipfs.isOnline === 'function' && !ipfs.isOnline()) {
        throw new UnavailableIpfs();
    }

    return new Ipid(ipfs, lifetime, apiMultiAddr, wsMultiAddr);
};

export default createDidIpid;
