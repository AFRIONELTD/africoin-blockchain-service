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

// Mint tokens (AFRiErc20 or AFRiTrc20)
router.post('/mint', async (req, res) => {
  const { type, privateKey, to, amount } = req.body || {};
  if (!type || !privateKey || !to || !amount) {
    return sendResponse(res, { success: false, message: 'type, privateKey, to, and amount are required.', data: null, status: 400 });
  }
  try {
    const normalizedType = String(type).toLowerCase();
    let txHash;
    if (normalizedType === 'afrierc20') {
      if (!to.startsWith('0x')) throw new Error('AFRiErc20 mint requires a 0x... address');
      const tx = await africoinService.mint(privateKey, to, amount);
      txHash = tx.hash;
    } else if (normalizedType === 'afritrc20') {
      if (!to.startsWith('T')) throw new Error('AFRiTrc20 mint requires a T... address');
      const tx = await TronAfricoinService.mint(privateKey, to, amount);
      txHash = tx;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Mint successful', data: { txHash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Add admin (AFRiErc20 or AFRiTrc20)
router.post('/add-admin', async (req, res) => {
  const { blockchain, privateKey, admin } = req.body || {};
  if (!blockchain || !privateKey || !admin) {
    return sendResponse(res, { success: false, message: 'blockchain, privateKey, and admin are required.', data: null, status: 400 });
  }
  try {
    const normalizedChain = String(blockchain).toLowerCase();
    let txHash;
    if (normalizedChain === 'afrierc20') {
      const tx = await africoinService.addAdmin(privateKey, admin);
      txHash = tx.hash;
    } else if (normalizedChain === 'afritrc20') {
      const tx = await TronAfricoinService.addAdmin(privateKey, admin);
      txHash = tx;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Admin added successfully', data: { txHash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Remove admin (owner only, AFRiErc20)
router.post('/remove-admin', async (req, res) => {
  const { admin } = req.body;
  try {
    const tx = await africoinService.removeAdmin(admin);
    sendResponse(res, { success: true, message: 'Admin removed successfully', data: { txHash: tx.hash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Check if address is admin (AFRiErc20)
router.get('/is-admin/:address', async (req, res) => {
  try {
    const isAdmin = await africoinService.isAdmin(req.params.address);
    sendResponse(res, { success: true, message: 'Admin status retrieved successfully', data: { isAdmin } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Get balance (AFRiErc20)
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
        blockchain: 'AFRiErc20',
        success: true,
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        timestamp
      });
      wallets.push({
        blockchain: 'AFRiTrc20',
        success: true,
        address: trxWallet.address,
        privateKey: trxWallet.privateKey,
        timestamp
      });
    } else if (String(type).toLowerCase() === 'afrierc20') {
      const ethWallet = await EthereumWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = ethWallet.mnemonic;
      wallets.push({
        blockchain: 'AFRiErc20',
        success: true,
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        timestamp
      });
    } else if (String(type).toLowerCase() === 'afritrc20') {
      const trxWallet = await TronWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = trxWallet.mnemonic;
      wallets.push({
        blockchain: 'AFRiTrc20',
        success: true,
        address: trxWallet.address,
        privateKey: trxWallet.privateKey,
        timestamp
      });
    } else {
      return sendResponse(res, { success: false, message: 'Invalid wallet type. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
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

// Create wallet - GET /create-wallet?type=AFRiErc20 or type=AFRiTrc20
router.get('/create-wallet', async (req, res) => {
  const { type, ...options } = req.query;
  try {
    const normalizedType = String(type || '').toLowerCase();
    let result;
    if (normalizedType === 'afrierc20') {
      result = await EthereumWalletService.generateWallet(options);
    } else if (normalizedType === 'afritrc20') {
      result = await TronWalletService.generateWallet(options);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid wallet type. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Wallet generated successfully', data: result });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Transfer route for AFRiErc20 and AFRiTrc20
router.post('/transfer', async (req, res) => {
  const { blockchain, privateKey, to, amount } = req.body || {};
  if (!blockchain || !privateKey || !to || !amount) {
    return sendResponse(res, { success: false, message: 'blockchain, privateKey, to, and amount are required.', data: null, status: 400 });
  }
  try {
    const normalizedChain = String(blockchain).toLowerCase();
    let txHash;
    if (normalizedChain === 'afrierc20') {
      if (!to.startsWith('0x')) throw new Error('AFRiErc20 transfer requires a 0x... address');
      const tx = await africoinService.transfer(privateKey, to, amount);
      txHash = tx.hash;
    } else if (normalizedChain === 'afritrc20') {
      if (!to.startsWith('T')) throw new Error('AFRiTrc20 transfer requires a T... address');
      const tx = await TronAfricoinService.transfer(privateKey, to, amount);
      txHash = tx;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Transfer successful', data: { txHash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Get token balance (AFRiErc20/AFRiTrc20) via query parameters, using known Africoin contract addresses
router.get('/wallet/token-balance', async (req, res) => {
  const { type, address } = req.query;
  if (!type || !address) {
    return sendResponse(res, { success: false, message: 'type and address are required as query parameters.', data: null, status: 400 });
  }
  try {
    const normalizedType = String(type).toLowerCase();
    let balance;
    if (normalizedType === 'afrierc20') {
      // Use Africoin ABI and contract address from africoinService.js/env
      const { AFRICOIN_ABI } = require('../services/africoinService');
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_ETH || config.ethereum?.contractAddress;
      if (!contractAddress) {
        return sendResponse(res, { success: false, message: 'Africoin contract address for AFRiErc20 not set.', data: null, status: 500 });
      }
      balance = await EthereumWalletService.getTokenBalance(address, contractAddress, AFRICOIN_ABI);
    } else if (normalizedType === 'afritrc20') {
      // Use Africoin ABI and contract address from Tron config/env
      const africoinJson = require('../../../Tron-smart-contract/build/contracts/Africoin.json');
      const tokenAbi = africoinJson.abi;
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_TRON || config.blockchain?.tronAfricoinContractAddress;
      if (!contractAddress) {
        return sendResponse(res, { success: false, message: 'Africoin contract address for AFRiTrc20 not set.', data: null, status: 500 });
      }
      balance = await TronWalletService.getTokenBalance(address, contractAddress, tokenAbi);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Token balance retrieved successfully', data: { balance } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Validate address for AFRiErc20 (Ethereum) and AFRiTrc20 (Tron)
router.get('/validate-address', async (req, res) => {
  const { type, address } = req.query || {};
  if (!type || !address) {
    return sendResponse(res, { success: false, message: 'type and address are required as query parameters.', data: null, status: 400 });
  }
  try {
    const normalizedType = String(type).toLowerCase();
    let isValid = false;

    if (normalizedType === 'afrierc20') {
      // Validate Ethereum-format address
      const { ethers } = require('ethers');
      // Support ethers v6 (ethers.isAddress) and fallback to v5 utils if needed
      isValid = typeof ethers.isAddress === 'function'
        ? ethers.isAddress(address)
        : (ethers.utils && typeof ethers.utils.isAddress === 'function' ? ethers.utils.isAddress(address) : false);
    } else if (normalizedType === 'afritrc20') {
      // Validate Tron-format address via existing TronWeb instance
      const tronWeb = TronWalletService.tronWeb;
      if (!tronWeb || typeof tronWeb.isAddress !== 'function') {
        throw new Error('TronWeb not initialized for validation');
      }
      isValid = tronWeb.isAddress(address);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use AFRiErc20 or AFRiTrc20.', data: null, status: 400 });
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

module.exports = router;