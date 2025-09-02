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

// Mint tokens (ETH or TRX)
router.post('/mint', async (req, res) => {
  const { type, privateKey, to, amount } = req.body || {};
  if (!type || !privateKey || !to || !amount) {
    return sendResponse(res, { success: false, message: 'type, privateKey, to, and amount are required.', data: null, status: 400 });
  }
  try {
    let txHash;
    if (type === 'ETH') {
      if (!to.startsWith('0x')) throw new Error('ETH mint requires a 0x... address');
      const tx = await africoinService.mint(privateKey, to, amount);
      txHash = tx.hash;
    } else if (type === 'TRX') {
      if (!to.startsWith('T')) throw new Error('TRX mint requires a T... address');
      const tx = await TronAfricoinService.mint(privateKey, to, amount);
      txHash = tx;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use ETH or TRX.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Mint successful', data: { txHash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});
//
// Add admin (ETH or TRX)
router.post('/add-admin', async (req, res) => {
  const { blockchain, privateKey, admin } = req.body || {};
  if (!blockchain || !privateKey || !admin) {
    return sendResponse(res, { success: false, message: 'blockchain, privateKey, and admin are required.', data: null, status: 400 });
  }
  try {
    let txHash;
    if (blockchain === 'ETH') {
      const tx = await africoinService.addAdmin(privateKey, admin);
      txHash = tx.hash;
    } else if (blockchain === 'TRX') {
      const tx = await TronAfricoinService.addAdmin(privateKey, admin);
      txHash = tx;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use ETH or TRX.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Admin added successfully', data: { txHash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Remove admin (owner only)
router.post('/remove-admin', async (req, res) => {
  const { admin } = req.body;
  try {
    const tx = await africoinService.removeAdmin(admin);
    sendResponse(res, { success: true, message: 'Admin removed successfully', data: { txHash: tx.hash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Check if address is admin
router.get('/is-admin/:address', async (req, res) => {
  try {
    const isAdmin = await africoinService.isAdmin(req.params.address);
    sendResponse(res, { success: true, message: 'Admin status retrieved successfully', data: { isAdmin } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 400 });
  }
});

// Get balance
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
        blockchain: 'ETH',
        success: true,
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        timestamp
      });
      wallets.push({
        blockchain: 'TRX',
        success: true,
        address: trxWallet.address,
        privateKey: trxWallet.privateKey,
        timestamp
      });
    } else if (type === 'ETH' || type === 'AFR_ERC' || type === 'AFRi_ERC20') {
      const ethWallet = await EthereumWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = ethWallet.mnemonic;
      wallets.push({
        blockchain: 'ETH',
        success: true,
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        timestamp
      });
    } else if (type === 'TRX' || type === 'AFR_TRX' || type === 'AFRi_TRC20') {
      const trxWallet = await TronWalletService.generateWallet({ ...options, includePrivateKey: true });
      seedPhrase = trxWallet.mnemonic;
      wallets.push({
        blockchain: 'TRX',
        success: true,
        address: trxWallet.address,
        privateKey: trxWallet.privateKey,
        timestamp
      });
    } else {
      return sendResponse(res, { success: false, message: 'Invalid wallet type. Use ETH/AFR_ERC/AFRi_ERC20 or TRX/AFR_TRX/AFRi_TRC20.', data: null, status: 400 });
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

// Create wallet - GET /create-wallet?type=ETH or type=TRX
router.get('/create-wallet', async (req, res) => {
  const { type, ...options } = req.query;
  try {
    let result;
    if (type === 'ETH' || type === 'AFR_ERC' || type === 'AFRi_ERC20') {
      result = await EthereumWalletService.generateWallet(options);
    } else if (type === 'TRX' || type === 'AFR_TRX' || type === 'AFRi_TRC20') {
      result = await TronWalletService.generateWallet(options);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid wallet type. Use ETH/AFR_ERC/AFRi_ERC20 or TRX/AFR_TRX/AFRi_TRC20.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Wallet generated successfully', data: result });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Transfer route for ETH and TRX
router.post('/transfer', async (req, res) => {
  const { blockchain, privateKey, to, amount } = req.body || {};
  if (!blockchain || !privateKey || !to || !amount) {
    return sendResponse(res, { success: false, message: 'blockchain, privateKey, to, and amount are required.', data: null, status: 400 });
  }
  try {
    let txHash;
    if (blockchain === 'ETH') {
      if (!to.startsWith('0x')) throw new Error('ETH transfer requires a 0x... address');
      const tx = await africoinService.transfer(privateKey, to, amount);
      txHash = tx.hash;
    } else if (blockchain === 'TRX') {
      if (!to.startsWith('T')) throw new Error('TRX transfer requires a T... address');
      const tx = await TronAfricoinService.transfer(privateKey, to, amount);
      txHash = tx;
    } else {
      return sendResponse(res, { success: false, message: 'Invalid blockchain. Use ETH or TRX.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Transfer successful', data: { txHash } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

// Get token balance (ERC20/TRC20) via query parameters, using known Africoin contract addresses
router.get('/wallet/token-balance', async (req, res) => {
  const { type, address } = req.query;
  if (!type || !address) {
    return sendResponse(res, { success: false, message: 'type and address are required as query parameters.', data: null, status: 400 });
  }
  try {
    let balance;
    if (type.toUpperCase() === 'ETH') {
      // Use Africoin ABI and contract address from africoinService.js/env
      const { AFRICOIN_ABI } = require('../services/africoinService');
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_ETH || config.ethereum?.contractAddress;
      if (!contractAddress) {
        return sendResponse(res, { success: false, message: 'Africoin contract address for ETH not set.', data: null, status: 500 });
      }
      balance = await EthereumWalletService.getTokenBalance(address, contractAddress, AFRICOIN_ABI);
    } else if (type.toUpperCase() === 'TRX') {
      // Use Africoin ABI and contract address from Tron config/env
      const africoinJson = require('../../../Tron-smart-contract/build/contracts/Africoin.json');
      const tokenAbi = africoinJson.abi;
      const config = require('../config/provider');
      const contractAddress = process.env.CONTRACT_ADDRESS_TRON || config.blockchain?.tronAfricoinContractAddress;
      if (!contractAddress) {
        return sendResponse(res, { success: false, message: 'Africoin contract address for TRX not set.', data: null, status: 500 });
      }
      balance = await TronWalletService.getTokenBalance(address, contractAddress, tokenAbi);
    } else {
      return sendResponse(res, { success: false, message: 'Invalid type. Use ETH or TRX.', data: null, status: 400 });
    }
    sendResponse(res, { success: true, message: 'Token balance retrieved successfully', data: { balance } });
  } catch (err) {
    sendResponse(res, { success: false, message: err.message, data: null, status: 500 });
  }
});

module.exports = router; 