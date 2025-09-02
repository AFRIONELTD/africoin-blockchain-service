// Patch TronWeb import for compatibility
const tronWebModule = require('tronweb');
let TronWeb;

// Handle different export patterns
if (typeof tronWebModule === 'function') {
  TronWeb = tronWebModule;
} else if (tronWebModule.TronWeb && typeof tronWebModule.TronWeb === 'function') {
  TronWeb = tronWebModule.TronWeb;
} else if (tronWebModule.default && typeof tronWebModule.default === 'function') {
  TronWeb = tronWebModule.default;
} else if (tronWebModule.default && tronWebModule.default.TronWeb) {
  TronWeb = tronWebModule.default.TronWeb;
} else {
  throw new Error('Unable to find TronWeb constructor in the imported module');
}
const africoinAbi = require('../../../Tron-smart-contract/build/contracts/Africoin.json').abi;
const config = require('../config/provider');
require('dotenv').config();

const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
const rawPrivateKey = process.env.PRIVATE_KEY_SHASTA || process.env.PRIVATE_KEY_TRON || process.env.PRIVATE_KEY;
// Remove 0x prefix for Tron private key if present
const privateKey = rawPrivateKey && rawPrivateKey.startsWith('0x') ? rawPrivateKey.slice(2) : rawPrivateKey;
const contractAddress = process.env.CONTRACT_ADDRESS_TRON;

if (!contractAddress) {
  throw new Error('Missing CONTRACT_ADDRESS_TRON in environment. Please set it in your .env file.');
}

const tronWeb = new TronWeb({
  fullHost: tronNode,
  privateKey
});

async function addAdmin(privateKey, adminAddress) {
  try {
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ fullHost: tronNode, privateKey });
    const contract = await tw.contract(africoinAbi, contractAddress);
    const tx = await contract.addAdmin(adminAddress).send();
    return tx;
  } catch (err) {
    throw new Error('Tron addAdmin failed: ' + err.message);
  }
}

async function mint(privateKey, to, amount) {
  try {
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ fullHost: tronNode, privateKey });
    const contract = await tw.contract(africoinAbi, contractAddress);
    const tx = await contract.mint(to, amount).send();
    return tx;
  } catch (err) {
    throw new Error('Tron mint failed: ' + err.message);
  }
}

async function transfer(privateKey, to, amount) {
  const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
  const tronWeb = new TronWeb({ fullHost: tronNode, privateKey });
  const contract = await tronWeb.contract(africoinAbi, contractAddress);
  return contract.transfer(to, amount).send();
}

module.exports = {
  addAdmin,
  transfer,
  mint,
}; 