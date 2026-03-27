const { ethers } = require('ethers');
const axios = require('axios');
const config = require('../config/provider');

const AGGREGATOR_ABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      { "name": "roundId", "type": "uint80" },
      { "name": "answer", "type": "int256" },
      { "name": "startedAt", "type": "uint256" },
      { "name": "updatedAt", "type": "uint256" },
      { "name": "answeredInRound", "type": "uint80" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// ETH/USD Mainnet
const ETH_USD_FEED = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';

async function getEthPrice() {
  try {
    const provider = config.ethereum.provider;
    const contract = new ethers.Contract(ETH_USD_FEED, AGGREGATOR_ABI, provider);
    const [, answer] = await contract.latestRoundData();
    // Chainlink ETH/USD has 8 decimals
    return Number(answer) / 1e8;
  } catch (err) {
    console.error('Chainlink ETH price fetch failed, falling back to CoinGecko:', err.message);
    try {
      const resp = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      return resp.data.ethereum.usd;
    } catch (cgErr) {
      console.error('CoinGecko fallback failed:', cgErr.message);
      return 4000; // Final hardcoded fallback
    }
  }
}

async function getTrxPrice() {
  try {
    const resp = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
    return resp.data.tron.usd;
  } catch (err) {
    console.error('Failed to fetch TRX price:', err.message);
    return 0.35; // Fallback price
  }
}

module.exports = {
  getEthPrice,
  getTrxPrice
};
