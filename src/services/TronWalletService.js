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
const { IWalletService } = require('../interfaces/wallet.interface');
const logger = require('../utils/logger');
const { ethers } = require('ethers');
const config = require('../config/provider');

class TronWalletService extends IWalletService {
  constructor() {
    super();
    this.type = 'TRX';
    this.tronWeb = new TronWeb({
      fullHost: process.env.NODE_ENV === 'development'
        ? config.blockchain?.tronTestnetRpcUrl
        : config.blockchain?.tronRpcUrl,
    });
  }

  async generateWallet(options = {}) {
    try {
      const {
        mnemonic: providedMnemonic,
        derivationPath,
        network = 'mainnet',
        includePrivateKey = true
      } = options;
      logger.info('Creating new Tron wallet');
      // Use ethers to generate phrase & derive wallet; no external bip39
      const ethWallet = providedMnemonic
        ? ethers.Wallet.fromPhrase(providedMnemonic, "m/44'/60'/0'/0/0")
        : ethers.Wallet.createRandom();
      const phrase = ethWallet.mnemonic?.phrase || providedMnemonic;
      // Derive TRON child key from the same seed but TRON path
      const root = ethers.HDNodeWallet.fromSeed(ethers.Mnemonic.fromPhrase(phrase).computeSeed());
      const path = derivationPath || "m/44'/195'/0'/0/0";
      logger.info(`Using Tron derivation path: ${path}`);
      const child = root.derivePath(path);
      const privateKeyHex = child.privateKey.replace(/^0x/, '');
      const address = TronWeb.address.fromPrivateKey(privateKeyHex);
      const result = {
        address,
        network,
        type: 'TRX',
        mnemonic: phrase,
        derivationPath: path
      };
      if (includePrivateKey) {
        result.privateKey = privateKeyHex;
      }
      logger.info(`New Tron wallet created: ${result.address}`);
      return result;
    } catch (error) {
      logger.error('Error generating Tron wallet:', error);
      throw new Error(`Failed to generate Tron wallet: ${error.message}`);
    }
  }

  async getWalletFromPrivateKey(privateKey, options = {}) {
    try {
      const { network = 'mainnet' } = options;
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      const account = await this.tronWeb.createAccount(cleanPrivateKey);
      const result = {
        address: account.address.base58,
        network,
        type: this.type,
        privateKey: cleanPrivateKey
      };
      logger.info(`Retrieved Tron wallet from private key: ${result.address}`);
      return result;
    } catch (error) {
      logger.error('Error getting Tron wallet from private key:', error);
      throw new Error(`Failed to get Tron wallet from private key: ${error.message}`);
    }
  }

  async getTokenBalance(address, tokenContractAddress, tokenAbi) {
    try {
      const contract = await this.tronWeb.contract(tokenAbi, tokenContractAddress);
      // Pass the address as the 'from' context to avoid owner_address error
      const balance = await contract.balanceOf(address).call({ from: address });
      return balance.toString();
    } catch (error) {
      logger.error('Error getting TRC20 token balance:', error);
      throw new Error(`Failed to get TRC20 token balance: ${error.message}`);
    }
  }
}

module.exports = new TronWalletService(); 