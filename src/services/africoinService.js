const { ethers } = require('ethers');
const config = require('../config/provider');
require('dotenv').config();

const provider = config.ethereum.provider;

// TODO: Replace with actual Africoin ABI
const AFRICOIN_ABI = [
  // Minimal ABI for demonstration
  "function mint(address to, uint256 amount) public",
  "function addAdmin(address admin) public",
  "function removeAdmin(address admin) public",
  "function isAdmin(address admin) public view returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)"
];

// Use the correct env variable for Ethereum
const contractAddress = process.env.CONTRACT_ADDRESS_ETH;
const privateKey = process.env.PRIVATE_KEY;

console.log('ETH contract address:', contractAddress); // Debug log
if (!contractAddress) {
  throw new Error('Missing CONTRACT_ADDRESS_ETH in environment. Please set it in your .env file.');
}

const wallet = new ethers.Wallet(privateKey, provider);
const africoin = new ethers.Contract(contractAddress, AFRICOIN_ABI, wallet);

async function mint(privateKey, to, amount) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const africoinWithSigner = new ethers.Contract(contractAddress, AFRICOIN_ABI, wallet);
  return africoinWithSigner.mint(to, amount);
}

async function addAdmin(privateKey, admin) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const africoinWithSigner = new ethers.Contract(contractAddress, AFRICOIN_ABI, wallet);
  return africoinWithSigner.addAdmin(admin);
}

async function removeAdmin(admin) {
  return africoin.removeAdmin(admin);
}

async function isAdmin(admin) {
  return africoin.isAdmin(admin);
}

async function getBalance(address) {
  return africoin.balanceOf(address);
}

async function transfer(privateKey, to, amount) {
  const { ethers } = require('ethers');
  const config = require('../config/provider');
  const provider = config.ethereum.provider;
  const contractAddress = process.env.CONTRACT_ADDRESS_ETH;
  const africoin = new ethers.Contract(contractAddress, AFRICOIN_ABI, provider);
  const wallet = new ethers.Wallet(privateKey, provider);
  const africoinWithSigner = africoin.connect(wallet);
  return africoinWithSigner.transfer(to, amount);
}

module.exports = {
  mint,
  addAdmin,
  removeAdmin,
  isAdmin,
  getBalance,
  transfer,
  AFRICOIN_ABI // Export the ABI for use in other modules
}; 