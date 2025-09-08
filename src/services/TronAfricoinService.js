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

// Load Africoin TRC20 ABI from local abi directory to avoid external path dependency
const africoinAbi = require('../abi/tron/africoin.json').abi;
const config = require('../config/provider');
require('dotenv').config();

const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
const rawPrivateKey = process.env.COMPANY_TRON_PRIVATE_KEY; // optional default signer for TRON
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

// Extract a transaction ID from various TronWeb send() response shapes
function extractTronTxId(res) {
  try {
    if (!res) return null;
    if (typeof res === 'string') return res; // txid as string
    if (Array.isArray(res)) {
      // Some TronWeb versions might return arrays; pick first hex-like 64-char string
      const cand = res.find(x => typeof x === 'string' && /^[0-9a-fA-F]{64}$/.test(x));
      return cand || null;
    }
    if (typeof res === 'object') {
      if (res.txid) return res.txid;
      if (res.txID) return res.txID;
      if (res.transaction && (res.transaction.txID || res.transaction.txid)) return res.transaction.txID || res.transaction.txid;
      if (res.result && (res.result.txid || res.result.txID)) return res.result.txid || res.result.txID;
      if (res.receipt && (res.receipt.txid || res.receipt.txID)) return res.receipt.txid || res.receipt.txID;
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function addAdmin(privateKey, adminAddress) {
  try {
    // Validate inputs
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!adminAddress || typeof adminAddress !== 'string') {
      throw new Error('Invalid admin address provided');
    }

    // Clean private key (remove 0x if present)
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Validate private key length (64 hex characters)
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({
      fullHost: tronNode,
      privateKey: cleanPrivateKey
    });

    // Derive sender address and ensure the instance has it set
    const fromAddress = TronWeb.address.fromPrivateKey(cleanPrivateKey);

    // Validate admin address format
    if (!tw.isAddress(adminAddress)) {
      throw new Error('Invalid Tron address format for admin');
    }

    const contract = await tw.contract(africoinAbi, contractAddress);

    // Call addAdmin with explicit from address and sane fee limit
    const sendRes = await contract.addAdmin(adminAddress).send({
      feeLimit: 100000000, // 100 TRX fee limit
      callValue: 0,
      shouldPollResponse: false,
      from: fromAddress
    });

    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron addAdmin error details:', err);
    throw new Error('Tron addAdmin failed: ' + err.message);
  }
}

async function mint(privateKey, to, amount) {
  try {
    // Validate inputs
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!to || typeof to !== 'string') {
      throw new Error('Invalid recipient address provided');
    }
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }
    
    // Clean private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Validate private key length
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }
    
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ 
      fullHost: tronNode, 
      privateKey: cleanPrivateKey 
    });
    
    // Validate recipient address
    if (!tw.isAddress(to)) {
      throw new Error('Invalid Tron address format for recipient');
    }
    
    const contract = await tw.contract(africoinAbi, contractAddress);
    
    const sendRes = await contract.mint(to, amount).send({
      feeLimit: 1000000000, // 1000 TRX fee limit
      callValue: 0,
      shouldPollResponse: false
    });
    
    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron mint error details:', err);
    throw new Error('Tron mint failed: ' + err.message);
  }
}

async function transfer(privateKey, to, amount) {
  try {
    // Validate inputs
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!to || typeof to !== 'string') {
      throw new Error('Invalid recipient address provided');
    }
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }
    
    // Clean private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Validate private key length
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }
    
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tronWeb = new TronWeb({ 
      fullHost: tronNode, 
      privateKey: cleanPrivateKey 
    });
    
    // Validate recipient address
    if (!tronWeb.isAddress(to)) {
      throw new Error('Invalid Tron address format for recipient');
    }
    
    const contract = await tronWeb.contract(africoinAbi, contractAddress);
    
    const sendRes = await contract.transfer(to, amount).send({
      feeLimit: 1000000000, // 1000 TRX fee limit
      callValue: 0,
      shouldPollResponse: false
    });

    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron transfer error details:', err);
    throw new Error('Tron transfer failed: ' + err.message);
  }
}

module.exports = {
  addAdmin,
  transfer,
  mint,
};