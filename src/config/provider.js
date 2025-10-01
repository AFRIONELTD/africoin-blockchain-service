const { ethers } = require('ethers');
require('dotenv').config();

// Prefer mainnet RPC when provided, otherwise fall back to Sepolia
const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.SEPOLIA_RPC_URL;

if (!rpcUrl) {
  throw new Error('ETHEREUM_RPC_URL or SEPOLIA_RPC_URL must be set to initialize the Ethereum provider.');
}

const provider = new ethers.JsonRpcProvider(rpcUrl);

const config = {
  ethereum: {
    provider,
    rpcUrl,
    network: process.env.ETHEREUM_RPC_URL ? process.env.ETHEREUM_NETWORK || 'mainnet' : 'sepolia'
  },
  blockchain: {
    tronRpcUrl: process.env.TRON_RPC_URL || 'https://api.trongrid.io',
    tronTestnetRpcUrl: process.env.TRON_TESTNET_RPC_URL || 'https://api.shasta.trongrid.io'
  }
};

module.exports = config; 