Object.defineProperty(exports, '__esModule', {
    value: true,
});
exports.generateRandomString = exports.isDidValid = exports.parseDid = exports.generateDid = exports.generateIpnsName = exports.pemToBuffer = void 0;

const _pify = _interopRequireDefault(require('pify'));

const _libp2pCrypto = _interopRequireDefault(require('libp2p-crypto'));

const _buffer = require('buffer');

const _peerId = require('peer-id');

const _errors = require('./errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const pemToBuffer = async (pem, password) => {
    const key = await (0, _pify.default)(_libp2pCrypto.default.keys.import)(pem, password);

    return key.bytes;
};

exports.pemToBuffer = pemToBuffer;

const generateIpnsName = async (key) => {
    const peerId = await (0, _pify.default)(_peerId.createFromPrivKey)(_buffer.Buffer.from(key));

    return peerId.toB58String();
};

exports.generateIpnsName = generateIpnsName;

const generateDid = async (key) => {
    const identifier = await generateIpnsName(key);

    return `did:ipid:${identifier}`;
};

exports.generateDid = generateDid;

const parseDid = (did) => {
    const match = did.match(/did:(\w+):(\w+).*/);

    if (!match) {
        throw new _errors.InvalidDid(did);
    }

    return {
        method: match[1],
        identifier: match[2],
    };
};

exports.parseDid = parseDid;

const isDidValid = (did) => {
    try {
        parseDid(did);

        return true;
    } catch (err) {
        return false;
    }
};

exports.isDidValid = isDidValid;

const generateRandomString = () => Math.random().toString(36)
.substring(2);

exports.generateRandomString = generateRandomString;
