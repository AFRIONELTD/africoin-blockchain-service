const express = require('express');
const router = express.Router();
const africoinService = require('../services/africoinService');
const EthereumWalletService = require('../services/EthereumWalletService');
const TronWalletService = require('../services/TronWalletService');
const TronAfricoinService = require('../services/TronAfricoinService');
const { sendResponse } = require('../utils/response');
const { authenticateToken } = require('../middleware/auth');

// Protect all routes with JWT authentication
router.use(authenticateToken);

// Mint tokens (AFRi_ERC20 or AFRi_TRC20)
router.post('/mint', async (req, res) => {
  const { type, blockchain, privateKey, to, amount } = req.body || {};
  const kind = type || blockchain; // accept both for convenience
  if (!kind || !privateKey || !to || !amount) {
    return sendResponse(res, { success: false, message: 'type or blockchain, privateKey, to, and amount are required.', data: null, status: 400 });
  }
  try {
    const normalizedType = String(kind).toUpperCase();
    let txHash;
    let explorerUrl;
    if (normalizedType === 'AFRI_ERC20') {
      if (!to.startsWith('0x')) throw new Error('AFRi_ERC20 mint requires a 0x... address');
      const tx = await africoinService.mint(privateKey, to, amount);
      txHash = tx.hash;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://sepolia.etherscan.io/tx/${txHash}` : `https://etherscan.io/tx/${txHash}`;
    } else if (normalizedType === 'AFRI_TRC20') {
      if (!to.startsWith('T')) throw new Error('AFRi_TRC20 mint requires a T... address');
      const cleanPk = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey; // Tron expects raw hex
      const tx = await TronAfricoinService.mint(cleanPk, to, amount);
      txHash = tx;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://shasta.tronscan.org/#/transaction/${txHash}` : `https://tronscan.org/#/transaction/${txHash}`;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Mint successful', data: { txHash, explorerUrl } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Burn tokens (AFRi_ERC20 or AFRi_TRC20)
router.post('/burn', async (req, res) => {
  const { blockchain, privateKey, from, amount } = req.body || {};
  if (!blockchain || !privateKey || !from || !amount) {
    return sendResponse(res, { success: false, message: 'blockchain, privateKey, from, and amount are required.', data: null, status: 400 });
  }
  try {
    const normalizedChain = String(blockchain).toUpperCase();
    let txHash;
    let explorerUrl;
    if (normalizedChain === 'AFRI_ERC20') {
      if (!from.startsWith('0x')) throw new Error('AFRi_ERC20 burn requires a 0x... address for from');
      const tx = await africoinService.burn(privateKey, from, amount);
      txHash = tx.hash;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://sepolia.etherscan.io/tx/${txHash}` : `https://etherscan.io/tx/${txHash}`;
    } else if (normalizedChain === 'AFRI_TRC20') {
      if (!from.startsWith('T')) throw new Error('AFRi_TRC20 burn requires a T... address for from');
      const cleanPk = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey; // Tron expects raw hex
      const tx = await TronAfricoinService.burn(cleanPk, from, amount);
      txHash = tx;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://shasta.tronscan.org/#/transaction/${txHash}` : `https://tronscan.org/#/transaction/${txHash}`;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Burn successful', data: { txHash, explorerUrl } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Add admin (AFRi_ERC20 or AFRi_TRC20)
router.post('/add-admin', async (req, res) => {
  const { type, blockchain, privateKey, admin } = req.body || {};
  const kind = type || blockchain; // accept both for convenience
  if (!kind || !privateKey || !admin) {
    return sendResponse(res, { success: false, message: 'type or blockchain, privateKey, and admin are required.', data: null, status: 400 });
  }
  try {
    const normalizedChain = String(kind).toUpperCase();
    let txHash;
    let explorerUrl;
    if (normalizedChain === 'AFRI_ERC20') {
      const tx = await africoinService.addAdmin(privateKey, admin);
      txHash = tx.hash;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://sepolia.etherscan.io/tx/${txHash}` : `https://etherscan.io/tx/${txHash}`;
    } else if (normalizedChain === 'AFRI_TRC20') {
      const cleanPk = privateKey; // Tron expects raw hex
      const tx = await TronAfricoinService.addAdmin(cleanPk, admin);
      txHash = tx;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://shasta.tronscan.org/#/transaction/${txHash}` : `https://tronscan.org/#/transaction/${txHash}`;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Admin added successfully', data: { txHash, explorerUrl } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Remove admin (owner only, AFRi_ERC20)
router.post('/remove-admin', async (req, res) => {
  const { admin } = req.body;
  try {
    const tx = await africoinService.removeAdmin(admin);
    const explorerUrl = process.env.NODE_ENV === 'test' ? `https://sepolia.etherscan.io/tx/${tx.hash}` : `https://etherscan.io/tx/${tx.hash}`;
    sendResponse(res, { success: true, message: 'Admin removed successfully', data: { txHash: tx.hash, explorerUrl } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Check if address is admin (AFRi_ERC20)
router.get('/is-admin/:address', async (req, res) => {
  try {
    const isAdmin = await africoinService.isAdmin(req.params.address);
    sendResponse(res, { success: true, message: 'Admin status retrieved successfully', data: { isAdmin } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Get balance (AFRi_ERC20)
router.get('/balance/:address', async (req, res) => {
  try {
    const balance = await africoinService.getBalance(req.params.address);
    sendResponse(res, { success: true, message: 'Balance retrieved successfully', data: { balance: balance.toString() } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Create wallet(s) - POST /create-wallets
router.post('/create-wallets', async (req, res) => {
  const { type, ...options } = req.body || {};
  try {
    let wallets = [];
    let seedPhrase = options.mnemonic;
    const timestamp = new Date().toISOString();

    if (!type) {
      // Generate a new mnemonic for both wallets if not provided
      const ethWallet = await EthereumWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = ethWallet.mnemonic;
      const trxWallet = await TronWalletService.generateWallet({ mnemonic: seedPhrase, includePrivateKey: true });
      wallets.push({
        blockchain: 'AFRi_ERC20',
        success: true,
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        timestamp
      });
      wallets.push({
        blockchain: 'AFRi_TRC20',
        success: true,
        address: trxWallet.address,
        privateKey: trxWallet.privateKey,
        timestamp
      });
    } else if (String(type).toUpperCase() === 'AFRI_ERC20') {
      const ethWallet = await EthereumWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = ethWallet.mnemonic;
      wallets.push({
        blockchain: 'AFRi_ERC20',
        success: true,
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        timestamp
      });
    } else if (String(type).toUpperCase() === 'AFRI_TRC20') {
      const trxWallet = await TronWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = trxWallet.mnemonic;
      wallets.push({
        blockchain: 'AFRi_TRC20',
        success: true,
        address: trxWallet.address,
        privateKey: trxWallet.privateKey,
        timestamp
      });
    } else {
      return sendResponse(res, { success: false, message: 'Invalid wallet type. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }

    sendResponse(res, {
      success: true,
      message: 'Wallets generated successfully',
      data: {
        seedPhrase,
        wallets
      }
    });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Create wallet - GET /create-wallet?type=AFRi_ERC20 or type=AFRi_TRC20
router.get('/create-wallet', async (req, res) => {
  const { type, ...options } = req.query;
  try {
    const normalizedType = String(type || '').toUpperCase();
    let result;
    if (normalizedType === 'AFRI_ERC20') {
      result = await EthereumWalletService.generateWallet(options);
    } else if (normalizedType === 'AFRI_TRC20') {
      result = await TronWalletService.generateWallet(options);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid wallet type. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Wallet generated successfully', data: result });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Transfer route - uses meta-transfer for Tron (reverted from direct transfer)
// Request body: { blockchain, privateKey, to, amount }
router.post('/transfer', async (req, res) => {
  const { blockchain, privateKey, to, amount } = req.body || {};
  if (!blockchain || !privateKey || !to || !amount) {
    return sendResponse(res, { success: false, message: 'blockchain, privateKey, to, and amount are required.', data: null, status: 400 });
  }
  try {
    const normalizedChain = String(blockchain).toUpperCase();
    let txHash;
    let explorerUrl;

    if (normalizedChain === 'AFRI_ERC20') {
      if (!to.startsWith('0x')) throw new Error('AFRi_ERC20 transfer requires a 0x... address');
      // Perform meta-transfer automatically using provided privateKey
      const tx = await africoinService.metaTransferAuto(privateKey, to, amount);
      txHash = tx.hash ?? tx?.transactionHash ?? tx;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://sepolia.etherscan.io/tx/${txHash}` : `https://etherscan.io/tx/${txHash}`;
    } else if (normalizedChain === 'AFRI_TRC20') {
      if (!to.startsWith('T')) throw new Error('AFRi_TRC20 transfer requires a T... address');
      // Perform meta-transfer automatically (user signs, company pays gas)
      const tx = await TronAfricoinService.metaTransferAuto(privateKey, to, amount);
      txHash = tx;
      explorerUrl = process.env.NODE_ENV === 'test' ? `https://shasta.tronscan.org/#/transaction/${txHash}` : `https://tronscan.org/#/transaction/${txHash}`;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }

    sendResponse(res, { success: true, message: 'Transfer Successful', data: { txHash, explorerUrl } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Get token balance (AFRi_ERC20/AFRi_TRC20) via query parameters, using known Africoin contract addresses
router.get('/wallet/token-balance', async (req, res) => {
  const { type, address } = req.query;
  if (!type || !address) {
    return sendResponse(res, { success: false, message: 'type and address are required as query parameters.', data: null, status: 400 });
  }
  try {
    const normalizedType = String(type).toUpperCase();
    let balance;
    if (normalizedType === 'AFRI_ERC20') {
      // Use Africoin ABI and contract address from africoinService.js/env
      const { AFRICOIN_ABI } = require('../services/africoinService');
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_ETH || config.ethereum?.contractAddress;
      if (!contractAddress) {
        return sendResponse(res, { success: false, message: 'Africoin contract address for AFRi_ERC20 not set.', data: null, status: 500 });
      }
      balance = await EthereumWalletService.getTokenBalance(address, contractAddress, AFRICOIN_ABI);
    } else if (normalizedType === 'AFRI_TRC20') {
      // Use Africoin ABI and contract address from Tron config/env
      const africoinJson = require('../abi/tron/africoin.json');
      const tokenAbi = africoinJson.abi;
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_TRON || config.blockchain?.tronAfricoinContractAddress;
      if (!contractAddress) {
        return sendResponse(res, { success: false, message: 'Africoin contract address for AFRi_TRC20 not set.', data: null, status: 500 });
      }
      balance = await TronWalletService.getTokenBalance(address, contractAddress, tokenAbi);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Token balance retrieved successfully', data: { balance } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Helper functions for prices (defined earlier in gas-fees)
async function getEthPrice() {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await resp.json();
    return data.ethereum.usd;
  } catch (err) {
    console.log('Failed to fetch ETH price, using fallback:', err.message);
    return 4187; // Fallback price
  }
}

async function getTrxPrice() {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
    const data = await resp.json();
    return data.tron.usd;
  } catch (err) {
    console.log('Failed to fetch TRX price, using fallback:', err.message);
    return 0.336; // Fallback price
  }
}

// Get gas fee estimate (AFRi_ERC20 or AFRi_TRC20)
router.get('/gas-fee', async (req, res) => {
  const { blockchain, type } = req.query || {};
  if (!blockchain || !type) {
    return sendResponse(res, { success: false, message: 'blockchain and type are required as query parameters.', data: null, status: 400 });
  }
  try {
    const normalizedChain = String(blockchain).toUpperCase();
    const normalizedType = String(type).toLowerCase();
    let gasFee;
    if (normalizedChain === 'AFRI_ERC20') {
      const ethFee = parseFloat(await africoinService.getGasFee(normalizedType));
      const ethPrice = await getEthPrice();
      gasFee = ethFee * ethPrice;
    } else if (normalizedChain === 'AFRI_TRC20') {
      const trxFee = parseFloat(await TronAfricoinService.getGasFee(normalizedType));
      const trxPrice = await getTrxPrice();
      gasFee = trxFee * trxPrice;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Gas fee retrieved successfully', data: { gasFee } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Validate address for AFRi_ERC20 (Ethereum) and AFRi_TRC20 (Tron)
router.get('/validate-address', async (req, res) => {
  const { type, address } = req.query || {};
  if (!type || !address) {
    return sendResponse(res, { success: false, message: 'type and address are required as query parameters.', data: null, status: 400 });
  }
  try {
    const normalizedType = String(type).toUpperCase();
    let isValid = false;

    if (normalizedType === 'AFRI_ERC20') {
      // Validate Ethereum-format address
      const { ethers } = require('ethers');
      // Support ethers v6 (ethers.isAddress) and fallback to v5 utils if needed
      isValid = typeof ethers.isAddress === 'function'
        ? ethers.isAddress(address)
        : (ethers.utils && typeof ethers.utils.isAddress === 'function' ? ethers.utils.isAddress(address) : false);
    } else if (normalizedType === 'AFRI_TRC20') {
      // Validate Tron-format address via existing TronWeb instance
      const tronWeb = TronWalletService.tronWeb;
      if (!tronWeb || typeof tronWeb.isAddress !== 'function') {
        throw new Error('TronWeb not initialized for validation');
      }
      isValid = tronWeb.isAddress(address);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use AFRi_ERC20 or AFRi_TRC20.', data: null, status: 400 });
    }

    // success reflects validity per request
    if (isValid) {
      return sendResponse(res, { success: true, message: 'Valid address', data: { isValid: true } });
    }
    return sendResponse(res, { success: false, message: 'Invalid address', data: { isValid: false }, status: 200 });
  } catch (err) {
    return sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Get multiple token balances in one request
// Query format: /wallet/token-balances?AFRi_ERC20=0x...&AFRi_TRC20=T...
router.get('/wallet/token-balances', async (req, res) => {
  const { AFRi_ERC20, AFRi_TRC20 } = req.query || {};
  if (!AFRi_ERC20 && !AFRi_TRC20) {
    return sendResponse(res, { success: false, message: 'Provide at least one of AFRi_ERC20 or AFRi_TRC20 addresses as query parameters.', data: null, status: 400 });
  }

  const data = {};
  const errors = [];
  const config = require('../config/provider');

  // ETH (AFRi_ERC20)
  if (AFRi_ERC20) {
    try {
      const { AFRICOIN_ABI } = require('../services/africoinService');
      const contractAddress = process.env.CONTRACT_ADDRESS_ETH || config.ethereum?.contractAddress;
      if (!contractAddress) {
        throw new Error('Africoin contract address for AFRi_ERC20 not set.');
      }
      const balance = await EthereumWalletService.getTokenBalance(AFRi_ERC20, contractAddress, AFRICOIN_ABI);
      data.AFRi_ERC20 = { address: AFRi_ERC20, balance };
    } catch (err) {
      errors.push(`AFRi_ERC20: ${err.message}`);
    }
  }

  // TRON (AFRi_TRC20)
  if (AFRi_TRC20) {
    try {
      const africoinJson = require('../abi/tron/africoin.json');
      const tokenAbi = africoinJson.abi;
      const contractAddress = process.env.CONTRACT_ADDRESS_TRON || config.blockchain?.tronAfricoinContractAddress;
      if (!contractAddress) {
        throw new Error('Africoin contract address for AFRi_TRC20 not set.');
      }
      const balance = await TronWalletService.getTokenBalance(AFRi_TRC20, contractAddress, tokenAbi);
      data.AFRi_TRC20 = { address: AFRi_TRC20, balance };
    } catch (err) {
      errors.push(`AFRi_TRC20: ${err.message}`);
    }
  }

  const success = errors.length === 0;
  const message = success ? 'Token balances retrieved successfully' : `Some balances failed: ${errors.join('; ')}`;
  return sendResponse(res, { success, message, data });
});

// Gas fees estimation endpoint
// GET /api/africoin/gas-fees?blockchain=AFRi_ERC20|AFRi_TRC20
router.get('/gas-fees', async (req, res) => {
  try {
    const { blockchain } = req.query || {};
    if (!blockchain) {
      return sendResponse(res, { success: false, message: 'blockchain query param is required (AFRi_ERC20 or AFRi_TRC20)', data: null, status: 400 });
    }

    const kind = String(blockchain).toUpperCase();
    if (kind !== 'AFRI_ERC20' && kind !== 'AFRI_TRC20') {
      return sendResponse(res, { success: false, message: 'Unsupported blockchain. Use AFRi_ERC20 or AFRi_TRC20', data: null, status: 400 });
    }

    // Helper function to get current ETH price in USD
    async function getEthPrice() {
      try {
        const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await resp.json();
        return data.ethereum.usd;
      } catch (err) {
        console.log('Failed to fetch ETH price, using fallback:', err.message);
        return 4187; // Fallback price
      }
    }

    // ETH estimation using Etherscan gas oracle (if ETHERSCAN_API_KEY set), with fallback defaults
    async function getEthereumGasFees() {
      const gweiToEth = (g) => Number(g) * 1e-9;
      let low, medium, high;
      try {
        const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
        const url = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!data || data.status !== '1') throw new Error(data?.message || 'Etherscan error');
        const r = data.result;
        const baseFee = gweiToEth(parseFloat(r.suggestBaseFee));
        low = baseFee + gweiToEth(parseFloat(r.SafeGasPrice));
        medium = baseFee + gweiToEth(parseFloat(r.ProposeGasPrice));
        high = baseFee + gweiToEth(parseFloat(r.FastGasPrice));
      } catch (_) {
        // Fallback static values in ETH
        const baseFee = gweiToEth(30);
        low = baseFee + gweiToEth(35);
        medium = baseFee + gweiToEth(40);
        high = baseFee + gweiToEth(50);
      }

      // Convert to AFRi_ERC20 (1 AFRi = 1 USD)
      const ethPrice = await getEthPrice();
      const lowAfri = low * ethPrice;
      const mediumAfri = medium * ethPrice;
      const highAfri = high * ethPrice;

      return { blockchain: 'AFRi_ERC20', unit: 'AFRi_ERC20', fees: { low: { totalFee: lowAfri }, medium: { totalFee: mediumAfri }, high: { totalFee: highAfri } } };
    }

    // Helper function to get current TRX price in USD
    async function getTrxPrice() {
      try {
        const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
        const data = await resp.json();
        return data.tron.usd;
      } catch (err) {
        console.log('Failed to fetch TRX price, using fallback:', err.message);
        return 0.336; // Fallback price
      }
    }

    // TRON estimation: static presets, matching your sample
    async function getTronGasFees() {
      const trxPrice = await getTrxPrice();
      const lowAfri = 0.3 * trxPrice;
      const mediumAfri = 0.4 * trxPrice;
      const highAfri = 0.4 * trxPrice;
      const urgentAfri = 0.4 * trxPrice;

      return {
        blockchain: 'AFRi_TRC20',
        unit: 'AFRi_TRC20',
        fees: {
          low: { totalFee: lowAfri },
          medium: { totalFee: mediumAfri },
          high: { totalFee: highAfri },
          urgent: { totalFee: urgentAfri }
        }
      };
    }

    // Map AFRi_* to base networks
    let result;
    if (kind === 'AFRI_ERC20') {
      result = await getEthereumGasFees();
    } else {
      result = await getTronGasFees();
    }

    return sendResponse(res, { success: true, message: 'Gas fees fetched', data: result });
  } catch (err) {
    return sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Transaction history: all transactions (native + token transfers) for a specific address
// GET /api/africoin/transactions/:address?type=AFRi_ERC20|AFRi_TRC20&page=0&size=20&fromTime=ISO&toTime=ISO
router.get('/transactions/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const type = String(req.query.type || '').toUpperCase();
    const page = Number(req.query.page ?? 0) || 0;
    const size = Math.min(Number(req.query.size ?? 20) || 20, 100);
    const fromTime = req.query.fromTime ? Date.parse(req.query.fromTime) : undefined; // ms
    const toTime = req.query.toTime ? Date.parse(req.query.toTime) : undefined; // ms

    if (!address) {
      return sendResponse(res, { success: false, message: 'address param is required', data: null, status: 400 });
    }
    if (type !== 'AFRI_ERC20' && type !== 'AFRI_TRC20') {
      return sendResponse(res, { success: false, message: 'type query must be AFRi_ERC20 or AFRi_TRC20', data: null, status: 400 });
    }

    // Helpers
    async function getEthTokenTransactions(addr, page, size, fromTime, toTime) {
      // Token transfers (ERC20)
      const { ethers } = require('ethers');
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_ETH;
      const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
      if (!contractAddress) throw new Error('CONTRACT_ADDRESS_ETH not set');

      // Etherscan paginates by page+offset (max 100). We'll align to batches of 100 and slice within.
      const etherscanPage = Math.floor((page * size) / 100) + 1;
      const offset = 100; // batch size
      const rpcUrl = (config && config.ethereum && config.ethereum.rpcUrl) || '';
      const isSepolia = /sepolia/i.test(rpcUrl);
      const baseUrl = isSepolia ? 'https://api-sepolia.etherscan.io/api' : 'https://api.etherscan.io/api';
      const params = new URLSearchParams({
        module: 'account',
        action: 'tokentx',
        contractaddress: contractAddress,
        address: addr,
        page: String(etherscanPage),
        offset: String(offset),
        sort: 'desc',
        apikey: apiKey
      });
      const url = `${baseUrl}?${params.toString()}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data || data.status !== '1') {
        throw new Error(data?.message || 'Etherscan API error');
      }
      let txs = data.result || [];
      // Time filter (client-side)
      if (fromTime || toTime) {
        txs = txs.filter(tx => {
          const ts = Number(tx.timeStamp) * 1000; // seconds -> ms
          if (fromTime && ts < fromTime) return false;
          if (toTime && ts > toTime) return false;
          return true;
        });
      }
      // Map to common format
      const explorerBaseUrl = isSepolia ? 'https://sepolia.etherscan.io/tx/' : 'https://etherscan.io/tx/';
      const formatted = txs.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatUnits(tx.value || '0', 18),
        timestamp: Number(tx.timeStamp) * 1000,
        status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
        network: 'AFRi_ERC20',
        tokenSymbol: 'AFRI',
        blockNumber: Number(tx.blockNumber || 0),
        gasUsed: tx.gas || undefined,
        gasPrice: tx.gasPrice || undefined,
        explorerUrl: `${explorerBaseUrl}${tx.hash}`
      }));
      // Slice for requested page subset inside the 100 batch
      const start = (page * size) % 100;
      const end = start + size;
      const paginated = formatted.slice(start, end);
      return { transactions: paginated, total: formatted.length };
    }

    async function getTronTokenTransactions(addr, page, size, fromTime, toTime) {
      // Token transfers (TRC20)
      const tronWeb = TronWalletService.tronWeb;
      if (!tronWeb) throw new Error('TronWeb not initialized');
      const hexAddress = tronWeb.address.toHex(addr);
      const contractAddress = process.env.CONTRACT_ADDRESS_TRON;
      // Choose Shasta for test, mainnet otherwise
      const isTest = (process.env.NODE_ENV || '').toLowerCase() === 'test' || /shasta/i.test(process.env.TRON_TESTNET_RPC_URL || '');
      const tronGridBaseUrl = isTest ? 'https://api.shasta.trongrid.io' : 'https://api.trongrid.io';
      const apiKey = process.env.TRON_PRO_API_KEY; // optional

      const url = new URL(`${tronGridBaseUrl}/v1/accounts/${hexAddress}/transactions/trc20`);
      url.searchParams.set('limit', String(Math.min(size, 50))); // TronGrid max 50
      url.searchParams.set('offset', String(page * size));
      url.searchParams.set('only_confirmed', 'true');
      url.searchParams.set('order_by', 'block_timestamp,desc');
      if (contractAddress) url.searchParams.set('contract_address', contractAddress);

      const headers = apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {};
      const resp = await fetch(url, { headers });
      const json = await resp.json();
      const txs = json?.data || [];

      // Filter by our token contract if API param not supported
      const filteredByContract = contractAddress
        ? txs.filter(tx => (tx.token_info && tx.token_info.address ? tx.token_info.address.toLowerCase() === contractAddress.toLowerCase() : true))
        : txs;

      // Time filter
      let timeFiltered = filteredByContract;
      if (fromTime || toTime) {
        timeFiltered = filteredByContract.filter(tx => {
          const ts = Number(tx.block_timestamp); // already ms
          if (fromTime && ts < fromTime) return false;
          if (toTime && ts > toTime) return false;
          return true;
        });
      }

      const decimals = (tx) => Number(tx?.token_info?.decimals ?? 18);
      const explorerBaseUrl = ((process.env.NODE_ENV || '').toLowerCase() === 'test') ? 'https://shasta.tronscan.org/#/transaction/' : 'https://tronscan.org/#/transaction/';
      const formatted = timeFiltered.map(tx => ({
        hash: tx.transaction_id,
        from: tx.from || (tx.from_address || null),
        to: tx.to || (tx.to_address || null),
        value: (Number(tx.value || 0) / Math.pow(10, decimals(tx))).toString(),
        timestamp: Number(tx.block_timestamp),
        status: 'confirmed',
        network: 'AFRi_TRC20',
        tokenSymbol: (tx.token_info && tx.token_info.symbol) || 'AFRI',
        blockNumber: tx.block || undefined,
        explorerUrl: `${explorerBaseUrl}${tx.transaction_id}`
      }));

      // TronGrid already paginates, but after filtering the count may shrink; ensure slice
      const start = 0;
      const end = Math.min(size, formatted.length);
      const paginated = formatted.slice(start, end);
      return { transactions: paginated, total: formatted.length };
    }

    // Fetch all transactions (native + token) for Ethereum
    async function getEthAllTransactions(addr, page, size, fromTime, toTime) {
      const { ethers } = require('ethers');
      const config = require('../config/provider');
      const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
      const rpcUrl = (config && config.ethereum && config.ethereum.rpcUrl) || '';
      const isSepolia = /sepolia/i.test(rpcUrl) || (process.env.NODE_ENV || '').toLowerCase() === 'test';
      const baseApi = isSepolia ? 'https://api-sepolia.etherscan.io/api' : 'https://api.etherscan.io/api';
      const explorerBaseUrl = isSepolia ? 'https://sepolia.etherscan.io/tx/' : 'https://etherscan.io/tx/';

      // Use batches of 100 from Etherscan and slice for pagination
      const etherscanPage = Math.floor((page * size) / 100) + 1;
      const offset = 100;

      const paramsNormal = new URLSearchParams({
        module: 'account',
        action: 'txlist',
        address: addr,
        startblock: '0',
        endblock: '99999999',
        page: String(etherscanPage),
        offset: String(offset),
        sort: 'desc',
        apikey: apiKey
      });

      const paramsToken = new URLSearchParams({
        module: 'account',
        action: 'tokentx',
        address: addr,
        page: String(etherscanPage),
        offset: String(offset),
        sort: 'desc',
        apikey: apiKey
      });

      const [normalResp, tokenResp] = await Promise.all([
        fetch(`${baseApi}?${paramsNormal.toString()}`),
        fetch(`${baseApi}?${paramsToken.toString()}`)
      ]);
      const [normalData, tokenData] = await Promise.all([normalResp.json(), tokenResp.json()]);

      const normalizeEtherscan = (data) => {
        if (!data) return [];
        if (data.status === '1') return data.result || [];
        const msg = String(data.message || '').toLowerCase();
        if (msg.includes('no transactions') || msg.includes('no records found')) return [];
        // treat rate limit errors or invalid key as hard errors
        throw new Error(data.message || 'Etherscan API error');
      };

      const normal = normalizeEtherscan(normalData);
      const token = normalizeEtherscan(tokenData);

      // Map normal ETH transfers
      const normalMapped = (normal || []).map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value || '0'),
        timestamp: Number(tx.timeStamp) * 1000,
        status: tx.isError === '0' ? 'confirmed' : 'failed',
        network: 'ETH',
        tokenSymbol: 'ETH',
        blockNumber: Number(tx.blockNumber || 0),
        gasUsed: tx.gasUsed || tx.gas,
        gasPrice: tx.gasPrice,
        type: 'native',
        explorerUrl: `${explorerBaseUrl}${tx.hash}`
      }));

      // Map ERC20 transfers (all tokens)
      const tokenMapped = (token || []).map(tx => {
        const decimals = Number(tx.tokenDecimal || 18);
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatUnits(tx.value || '0', decimals),
          timestamp: Number(tx.timeStamp) * 1000,
          status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
          network: 'ETH',
          tokenSymbol: tx.tokenSymbol || 'ERC20',
          blockNumber: Number(tx.blockNumber || 0),
          gasUsed: tx.gas || undefined,
          gasPrice: tx.gasPrice || undefined,
          type: 'erc20',
          explorerUrl: `${explorerBaseUrl}${tx.hash}`
        };
      });

      // Merge, optional time filter, sort, and paginate
      let combined = [...normalMapped, ...tokenMapped];
      if (fromTime || toTime) {
        combined = combined.filter(tx => {
          const ts = Number(tx.timestamp);
          if (fromTime && ts < fromTime) return false;
          if (toTime && ts > toTime) return false;
          return true;
        });
      }
      combined.sort((a, b) => b.timestamp - a.timestamp);

      const start = page * size;
      const end = start + size;
      return { transactions: combined.slice(start, end), total: combined.length };
    }

    // Fetch all transactions (native + TRC20) for Tron
    async function getTronAllTransactions(addr, page, size, fromTime, toTime) {
      const tronWeb = TronWalletService.tronWeb;
      if (!tronWeb) throw new Error('TronWeb not initialized');
      const hexAddress = tronWeb.address.toHex(addr);
      const isTest = (process.env.NODE_ENV || '').toLowerCase() === 'test';
      const tronGridBaseUrl = isTest ? 'https://api.shasta.trongrid.io' : 'https://api.trongrid.io';
      const explorerBaseUrl = isTest ? 'https://shasta.tronscan.org/#/transaction/' : 'https://tronscan.org/#/transaction/';
      const apiKey = process.env.TRON_PRO_API_KEY;

      const limit = Math.min(size, 50);
      const offset = page * size;

      const headers = apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {};

      const nativeUrl = new URL(`${tronGridBaseUrl}/v1/accounts/${hexAddress}/transactions`);
      nativeUrl.searchParams.set('limit', String(limit));
      nativeUrl.searchParams.set('offset', String(offset));
      nativeUrl.searchParams.set('only_confirmed', 'true');
      nativeUrl.searchParams.set('order_by', 'block_timestamp,desc');

      const trc20Url = new URL(`${tronGridBaseUrl}/v1/accounts/${hexAddress}/transactions/trc20`);
      trc20Url.searchParams.set('limit', String(limit));
      trc20Url.searchParams.set('offset', String(offset));
      trc20Url.searchParams.set('only_confirmed', 'true');
      trc20Url.searchParams.set('order_by', 'block_timestamp,desc');

      const [nativeResp, trc20Resp] = await Promise.all([
        fetch(nativeUrl, { headers }),
        fetch(trc20Url, { headers })
      ]);
      const [nativeJson, trc20Json] = await Promise.all([nativeResp.json(), trc20Resp.json()]);
      const nativeTxs = nativeJson?.data || [];
      const trc20Txs = trc20Json?.data || [];

      const nativeMapped = nativeTxs.map(tx => {
        try {
          const contract = tx.raw_data?.contract?.[0];
          const val = contract?.parameter?.value || {};
          const fromHex = val.owner_address;
          const toHex = val.to_address || null;
          return {
            hash: tx.txID,
            from: fromHex ? tronWeb.address.fromHex(fromHex) : null,
            to: toHex ? tronWeb.address.fromHex(toHex) : null,
            value: (Number(val.amount || 0) / 1e6).toString(), // SUN -> TRX
            timestamp: Number(tx.block_timestamp),
            status: (tx.ret?.[0]?.contractRet || '') === 'SUCCESS' ? 'confirmed' : 'failed',
            network: 'TRX',
            tokenSymbol: 'TRX',
            blockNumber: tx.blockNumber,
            type: 'native',
            explorerUrl: `${explorerBaseUrl}${tx.txID}`
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      const trc20Mapped = trc20Txs.map(tx => {
        const dec = Number(tx?.token_info?.decimals ?? 18);
        return {
          hash: tx.transaction_id,
          from: tx.from || tx.from_address || null,
          to: tx.to || tx.to_address || null,
          value: (Number(tx.value || 0) / Math.pow(10, dec)).toString(),
          timestamp: Number(tx.block_timestamp),
          status: 'confirmed',
          network: 'TRX',
          tokenSymbol: tx?.token_info?.symbol || 'TRC20',
          blockNumber: tx.block || undefined,
          type: 'trc20',
          explorerUrl: `${explorerBaseUrl}${tx.transaction_id}`
        };
      });

      let combined = [...nativeMapped, ...trc20Mapped];
      if (fromTime || toTime) {
        combined = combined.filter(tx => {
          const ts = Number(tx.timestamp);
          if (fromTime && ts < fromTime) return false;
          if (toTime && ts > toTime) return false;
          return true;
        });
      }
      combined.sort((a, b) => b.timestamp - a.timestamp);

      const start = page * size;
      const end = start + size;
      return { transactions: combined.slice(start, end), total: combined.length };
    }

    let result;
    if (type === 'AFRI_ERC20') {
      result = await getEthAllTransactions(address, page, size, fromTime, toTime);
    } else {
      result = await getTronAllTransactions(address, page, size, fromTime, toTime);
    }

    return sendResponse(res, {
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        address,
        type,
        transactions: result.transactions,
        pagination: { page, size, total: result.total }
      }
    });
  } catch (err) {
    return sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

module.exports = router;