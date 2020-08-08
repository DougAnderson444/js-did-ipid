Object.defineProperty(exports, '__esModule', {
    value: true,
});
exports.default = exports.getDid = void 0;

const _document = _interopRequireWildcard(require('./document'));

const _utils = require('./utils');

const _errors = require('./utils/errors');

const _itLast = _interopRequireDefault(require('it-last'));

const _ipnsUtils = _interopRequireDefault(require('./utils/ipnsUtils'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) { return obj; } const newObj = {};

    if (obj != null) {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};

                if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; }
            }
        }
    } newObj.default = obj;

    return newObj;
}

function _classPrivateFieldGet(receiver, privateMap) {
    if (!privateMap.has(receiver)) { throw new TypeError('attempted to get private field on non-instance'); } const descriptor = privateMap.get(receiver);

    if (descriptor.get) { return descriptor.get.call(receiver); }

    return descriptor.value;
}

function _classPrivateFieldSet(receiver, privateMap, value) {
    if (!privateMap.has(receiver)) { throw new TypeError('attempted to set private field on non-instance'); } const descriptor = privateMap.get(receiver);

    if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError('attempted to set read only private field'); } descriptor.value = value; }

    return value;
}

class Ipid {
    constructor(ipfs, lifetime, apiMultiAddr, wsMultiAddr) {
        _ipfs.set(this, {
            writable: true,
            value: void 0,
        });

        _lifetime.set(this, {
            writable: true,
            value: void 0,
        });

        _apiMultiAddr.set(this, {
            writable: true,
            value: void 0,
        });

        _wsMultiAddr.set(this, {
            writable: true,
            value: void 0,
        });

        _publish.set(this, {
            writable: true,
            value: async (pem, content) => {
                const keyName = _classPrivateFieldGet(this, _generateKeyName).call(this);

                const start = Date.now();

                await _classPrivateFieldGet(this, _importKey).call(this, keyName, pem);

                try {
                    const cid = await _classPrivateFieldGet(this, _ipfs).dag.put(content, {
                        pin: true,
                    });
                    const path = `/ipfs/${cid.toBaseEncodedString()}`;

                    console.log('publishing', content, ` to ${path} ${new Date(start).toLocaleTimeString()}`);

                    _classPrivateFieldGet(this, _ipfs).name.publish(path, {
                        resolve: false,
                        key: keyName,
                    }).then((resLocal) => {
                        console.log(`published ${resLocal.value} to  ${resLocal.name} ended: ${Date.now() - start}`);
                    })
                    .catch((error) => {
                        console.log(error);
                    }); // Push it to the goIpfs node network

                    (0, _ipnsUtils.default)(pem, _classPrivateFieldGet(this, _apiMultiAddr), _classPrivateFieldGet(this, _wsMultiAddr), cid).then(() => {
                        console.log(`published to go ${Date.now() - start}ms`);
                    })
                    .catch((error) => {
                        console.log(error);
                    });

                    return content;
                } catch (err) {
                    console.log(err);
                } finally {
                    await _classPrivateFieldGet(this, _removeKey).call(this, keyName);
                }
            },
        });

        _removeKey.set(this, {
            writable: true,
            value: async (keyName) => {
                const keysList = await _classPrivateFieldGet(this, _ipfs).key.list();
                const hasKey = keysList.some(({
                    name,
                }) => name === keyName);

                if (!hasKey) {
                    return;
                }

                await _classPrivateFieldGet(this, _ipfs).key.rm(keyName);
            },
        });

        _importKey.set(this, {
            writable: true,
            value: async (keyName, pem, password) => {
                await _classPrivateFieldGet(this, _removeKey).call(this, keyName);
                await _classPrivateFieldGet(this, _ipfs).key.import(keyName, pem, password);
            },
        });

        _generateKeyName.set(this, {
            writable: true,
            value: () => `js-ipid-${(0, _utils.generateRandomString)()}`,
        });

        _classPrivateFieldSet(this, _ipfs, ipfs);

        _classPrivateFieldSet(this, _lifetime, lifetime || '87600h');

        _classPrivateFieldSet(this, _apiMultiAddr, apiMultiAddr);

        _classPrivateFieldSet(this, _wsMultiAddr, wsMultiAddr);
    }

    async resolve(did) {
        const {
            identifier,
        } = (0, _utils.parseDid)(did);

        try {
            const path = await (0, _itLast.default)(_classPrivateFieldGet(this, _ipfs).name.resolve(identifier));
            const cidStr = path.replace(/^\/ipfs\//, '');
            const {
                value: content,
            } = await _classPrivateFieldGet(this, _ipfs).dag.get(cidStr);

            (0, _document.assertDocument)(content);

            return content;
        } catch (err) {
            console.log('resolve err:', err);

            if (err.code === 'INVALID_DOCUMENT') {
                throw err;
            }

            throw new _errors.InvalidDid(did, `Unable to resolve document with DID: ${did}`, {
                originalError: err.message,
            });
        }
    }

    async create(pem, operations) {
        const did = await getDid(pem);
        const document = (0, _document.default)(did);

        operations(document);

        return _classPrivateFieldGet(this, _publish).call(this, pem, document.getContent());
    }

    async update(pem, operations) {
        const did = await getDid(pem);
        const content = await this.resolve(did);
        const document = (0, _document.default)(did, content);

        operations(document);

        return _classPrivateFieldGet(this, _publish).call(this, pem, document.getContent());
    }
}

var _ipfs = new WeakMap();

var _lifetime = new WeakMap();

var _apiMultiAddr = new WeakMap();

var _wsMultiAddr = new WeakMap();

var _publish = new WeakMap();

var _removeKey = new WeakMap();

var _importKey = new WeakMap();

var _generateKeyName = new WeakMap();

const getDid = async (pem) => {
    const key = await (0, _utils.pemToBuffer)(pem);

    return (0, _utils.generateDid)(key);
};

exports.getDid = getDid;

const createDidIpid = (ipfs, {
    lifetime,
} = {}, apiMultiAddr, wsMultiAddr) => {
    if (typeof ipfs.isOnline === 'function' && !ipfs.isOnline()) {
        throw new _errors.UnavailableIpfs();
    }

    return new Ipid(ipfs, lifetime, apiMultiAddr, wsMultiAddr);
};

const _default = createDidIpid;

exports.default = _default;
