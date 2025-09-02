// Wallet service interface
class IWalletService {
  /**
   * Generate a new wallet
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  generateWallet(options = {}) {}

  /**
   * Get wallet from private key
   * @param {string} privateKey
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  getWalletFromPrivateKey(privateKey, options = {}) {}

  /**
   * Get wallet from user ID
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  getWalletFromUserId(userId) {}

  /**
   * Get balance for an address
   * @param {string} address
   * @returns {Promise<number|string>}
   */
  getBalance(address) {}
}

module.exports = { IWalletService }; 