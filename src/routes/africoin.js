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

module.exports = router;