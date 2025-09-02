const { ethers } = require('ethers');
const { IWalletService } = require('../interfaces/wallet.interface');
const logger = require('../utils/logger');

class EthereumWalletService extends IWalletService {
  constructor() {
    super();
    this.type = 'ETH';
  }

  async generateWallet(options = {}) {
    try {
      const { mnemonic, derivationPath, network = 'mainnet', includePrivateKey = false } = options;
      let wallet;
      if (mnemonic) {
        const path = derivationPath || "m/44'/60'/0'/0/0";
        wallet = ethers.Wallet.fromPhrase(mnemonic, path);
      } else {
        wallet = ethers.Wallet.createRandom();
      }
      const result = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        network,
        type: 'ETH',
        mnemonic: wallet.mnemonic?.phrase || mnemonic,
        derivationPath: wallet.path,
      };
      if (includePrivateKey) {
        result.privateKey = wallet.privateKey;
      }
      logger.info(`Generated new ${network} Ethereum wallet: ${wallet.address}`);
      return result;
    } catch (error) {
      logger.error('Error generating Ethereum wallet:', error);
      throw new Error(`Failed to generate Ethereum wallet: ${error.message}`);
    }
  }

  async getWalletFromPrivateKey(privateKey, options = {}) {
    try {
      const { network = 'mainnet' } = options;
      const wallet = new ethers.Wallet(privateKey);
      const result = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        network,
        type: this.type,
        privateKey: wallet.privateKey,
      };
      logger.info(`Retrieved Ethereum wallet from private key: ${wallet.address}`);
      return result;
    } catch (error) {
      logger.error('Error getting Ethereum wallet from private key:', error);
      throw new Error(`Failed to get Ethereum wallet from private key: ${error.message}`);
    }
  }

  async getTokenBalance(address, tokenContractAddress, tokenAbi) {
    try {
      const config = require('../config/provider');
      const provider = config.ethereum.provider;
      if (!provider) {
        logger.error('Ethereum provider is undefined:', provider);
        throw new Error('Ethereum provider is undefined. Check your SEPOLIA_RPC_URL and config.');
      }
      const contract = new ethers.Contract(tokenContractAddress, tokenAbi, provider);
      const balance = await contract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      logger.error('Error getting ERC20 token balance:', error);
      throw new Error(`Failed to get ERC20 token balance: ${error.message}`);
    }
  }
}

module.exports = new EthereumWalletService(); 