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
    this.type = 'AFRi_TRC20';
    this.tronWeb = new TronWeb({
      fullHost: process.env.NODE_ENV === 'development'
        ? config.blockchain?.tronTestnetRpcUrl
        : config.blockchain?.tronRpcUrl,
    });
    // Optionally set a default caller address so RPC calls include owner_address.
    // Prefer explicit TRON_CALLER_PRIVATE_KEY, fall back to PRIVATE_KEY_SHASTA if present.
    try {
      const callerPk = process.env.TRON_CALLER_PRIVATE_KEY || process.env.PRIVATE_KEY_SHASTA;
      if (callerPk) {
        const cleanPk = String(callerPk).startsWith('0x') ? String(callerPk).slice(2) : String(callerPk);
        const callerBase58 = this.tronWeb.address.fromPrivateKey(cleanPk);
        this.tronWeb.defaultAddress = {
          base58: callerBase58,
          hex: this.tronWeb.address.toHex(callerBase58)
        };
        logger.info('TronWeb default caller set to', callerBase58);
      }
    } catch (err) {
      logger.warn('Failed to set TronWeb defaultAddress from env private key', err?.message || err);
    }
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
        type: 'AFRi_TRC20',
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
      // Validate the target address
      if (!this.tronWeb.isAddress(address)) {
        throw new Error(`Invalid TRON wallet address: ${address}`);
      }

      // Ensure contract address is Base58 (TronWeb.contract expects base58)
      const base58Contract = tokenContractAddress && tokenContractAddress.startsWith('T')
        ? tokenContractAddress
        : this.tronWeb.address.fromHex(tokenContractAddress);

      // Determine caller (base58) and convert to HEX for owner_address requirement
      const callerBase58 = (this.tronWeb.defaultAddress && this.tronWeb.defaultAddress.base58) ? this.tronWeb.defaultAddress.base58 : address;
      const callerHex = this.tronWeb.address.toHex(callerBase58);

      const contract = await this.tronWeb.contract(tokenAbi, base58Contract);
      // Use Base58 for the balanceOf argument, but supply owner_address in HEX
      const balance = await contract.balanceOf(address).call({ from: callerHex });

      // AFRI TRC20 uses 6 decimals on TRON; adjust if needed
      return ethers.formatUnits(BigInt(balance.toString()), 6);
    } catch (error) {
      logger.error('Error getting TRC20 token balance:', error?.message || error);
      throw new Error(`Failed to get TRC20 token balance: ${error.message || error}`);
    }
  }
}

module.exports = new TronWalletService();