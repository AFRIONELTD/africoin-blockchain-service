const { ethers } = require('ethers');
require('dotenv').config();

// Ensure SEPOLIA_RPC_URL is set
if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error('SEPOLIA_RPC_URL environment variable is not set. Please set it to your Ethereum node RPC URL.');
}

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const config = {
  ethereum: {
    provider,
    rpcUrl: process.env.SEPOLIA_RPC_URL
  },
  blockchain: {
    tronRpcUrl: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
    tronTestnetRpcUrl: process.env.TRON_TESTNET_RPC_URL || 'https://api.shasta.trongrid.io'
  }
};

module.exports = config; 