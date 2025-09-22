const { ethers } = require('ethers');
const config = require('../config/provider');
require('dotenv').config();

const provider = config.ethereum.provider;

// Load AFRi contract ABI (prefer local JSON; fallback to repo root; final fallback to minimal signatures)
let AFRICOIN_ABI;
try {
  AFRICOIN_ABI = require('../abi/eth/africoin.json').abi; // if present
} catch (_) {
  try {
    AFRICOIN_ABI = require('../../../ABI.json'); // repo root
  } catch (_) {
    AFRICOIN_ABI = [
      "function mint(address to, uint256 amount) public",
      "function addAdmin(address admin) public",
      "function removeAdmin(address admin) public",
      "function isAdmin(address admin) public view returns (bool)",
      "function balanceOf(address account) public view returns (uint256)",
      "function transfer(address to, uint256 amount) public returns (bool)",
      "function metaTransfer(address from,address to,uint256 amount,uint256 nonce,uint256 deadline,uint256 gasCostUSD,bytes signature) public",
      "function getNonce(address user) public view returns (uint256)"
    ];
  }
}

// Use the correct env variable for AFRi_ERC20 (Ethereum)
const contractAddress = process.env.CONTRACT_ADDRESS_ETH;
const privateKey = process.env.COMPANY_ETH_PRIVATE_KEY; // relayer/admin key for meta-tx submission

console.log('AFRi_ERC20 contract address:', contractAddress); // Debug log
if (!contractAddress) {
  throw new Error('Missing CONTRACT_ADDRESS_ETH for AFRi_ERC20 in environment. Please set it in your .env file.');
}

const wallet = new ethers.Wallet(privateKey, provider);
const africoin = new ethers.Contract(contractAddress, AFRICOIN_ABI, wallet);

// Local per-address nonce cache to avoid reusing nonces across rapid calls
const ethNonceCache = new Map(); // Map<string, bigint>
function getNextLocalEthNonce(address) {
  const now = BigInt(Date.now());
  const last = ethNonceCache.get(address) ?? -1n;
  let next = now;
  if (next <= last) next = last + 1n;
  ethNonceCache.set(address, next);
  return next;
}

async function mint(privateKey, to, amount) {
  const amountWei = ethers.parseUnits(amount.toString(), 18);
  const wallet = new ethers.Wallet(privateKey, provider);
  const africoinWithSigner = new ethers.Contract(contractAddress, AFRICOIN_ABI, wallet);
  return africoinWithSigner.mint(to, amountWei);
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

async function getUserNonce(userAddress) {
  try {
    const nonce = await africoin.getNonce(userAddress);
    console.log('Fetched nonce for', userAddress, ':', nonce);
    return nonce;
  } catch (error) {
    console.log('Failed to fetch nonce for', userAddress, ':', error.message);
    throw new Error('Unable to fetch user nonce from contract');
  }
}

async function getBalance(address) {
  const balance = await africoin.balanceOf(address);
  return ethers.formatUnits(balance, 18);
}

// Legacy direct transfer kept for compatibility (non-meta)
async function transfer(privateKey, to, amount) {
  const amountWei = ethers.parseUnits(amount.toString(), 18);
  const { ethers } = require('ethers');
  const config = require('../config/provider');
  const provider = config.ethereum.provider;
  const contractAddress = process.env.CONTRACT_ADDRESS_ETH;
  const africoin = new ethers.Contract(contractAddress, AFRICOIN_ABI, provider);
  const wallet = new ethers.Wallet(privateKey, provider);
  const africoinWithSigner = africoin.connect(wallet);
  return africoinWithSigner.transfer(to, amountWei);
}

// New meta-transfer using relayer (company) key
async function metaTransfer({ from, to, amount, nonce, deadline, gasCostUSD, signature }) {
  if (!from || !to || !amount || nonce === undefined || !deadline || !gasCostUSD || !signature) {
    throw new Error('Missing required meta-transfer fields');
  }
  const amountWei = ethers.parseUnits(amount.toString(), 18);
  return africoin.metaTransfer(from, to, amountWei, nonce, deadline, gasCostUSD, signature);
}

// Under-the-hood meta transfer using user's private key input and internal gas/nonce/signing
// Signature changed to positional args for simplicity: (privateKey, to, amount, bufferBps?)
async function metaTransferAuto(privateKey, to, amount, bufferBps = 1000) { // 1000 = +10%
  if (!privateKey || !to || !amount) throw new Error('privateKey, to, and amount are required');

  const amountWei = ethers.parseUnits(amount.toString(), 18);
  const userWallet = new ethers.Wallet(privateKey, provider);
  const from = await userWallet.getAddress();

  // Gather chain/domain info
  const network = await provider.getNetwork();

  const chainId = Number(network.chainId);
  console.log(chainId)

  // Nonce and deadline (use local monotonic nonce to avoid reuse)
  const nonce = getNextLocalEthNonce(from);
  const deadline = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes

  // Estimate gas cost in USD tokens (AFRi = $1)
  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice; // bigint
  if (!maxFeePerGas) throw new Error('Unable to fetch gas price');

  // First-pass assume a conservative gas limit
  const assumedGasLimit = 180000n; // metaTransfer cost rough guess
  const ethCostWei = assumedGasLimit * maxFeePerGas;

  // Convert ETH -> USD using env var or default
  const ethUsdStr = process.env.ETH_USD_PRICE || '3000';
  const ethUsd = Number(ethUsdStr);
  if (!ethUsd || ethUsd <= 0) throw new Error('Invalid ETH_USD_PRICE');

  // Convert wei to ETH (1e18) then to USD
  const ethCost = Number(ethCostWei) / 1e18;
  let gasCostUSDNumber = ethCost * ethUsd;
  gasCostUSDNumber = gasCostUSDNumber * (1 + bufferBps / 10000); // add buffer

  // Convert USD number -> AFRi token units (18 decimals)
  const gasCostUSD = ethers.parseUnits(gasCostUSDNumber.toFixed(6), 18); // 6dp precision then scale

  // Build EIP-712 typed data
  const domain = {
    name: 'AFRi',
    version: '1',
    chainId,
    verifyingContract: contractAddress
  };
  const types = {
    Transfer: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'gasCostUSD', type: 'uint256' }
    ]
  };

  // Loop to find correct nonce
  let currentNonce = BigInt(nonce);
  let signature;
  let value = {
    from,
    to,
    amount: amountWei,
    nonce: currentNonce,
    deadline: BigInt(deadline),
    gasCostUSD
  };
  signature = await userWallet.signTypedData(domain, types, value);

  // No pre-flight chain nonce: we rely on local cache to avoid races and contract uses (from, nonce) uniqueness

  const maxRetries = 5; // Prevent infinite loop
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await africoin.estimateGas.metaTransfer(from, to, amountWei, currentNonce, deadline, gasCostUSD, signature);
      break; // Success, proceed
    } catch (err) {
      if (err.reason && err.reason.includes("nonce already used")) {
        // Pick a higher local nonce and re-sign
        const next = getNextLocalEthNonce(from);
        console.log(`🔁 estimateGas nonce update: current=${currentNonce}, next=${next}`);
        currentNonce = BigInt(next);
        value.nonce = currentNonce;
        signature = await userWallet.signTypedData(domain, types, value);
      } else {
        // Other error, proceed with current
        break;
      }
    }
  }

  // Now refine gas with correct nonce
  let finalSignature = signature;
  let finalGasCostUSD = gasCostUSD;
  try {
    const estGas = await africoin.estimateGas.metaTransfer(from, to, amountWei, currentNonce, deadline, finalGasCostUSD, finalSignature);
    const ethCostWei2 = estGas * maxFeePerGas;
    let gasCostUSD2 = Number(ethCostWei2) / 1e18 * ethUsd * (1 + bufferBps / 10000);
    const gasCostUSDAdj = ethers.parseUnits(gasCostUSD2.toFixed(6), 18);
    if (gasCostUSDAdj !== finalGasCostUSD) {
      const value2 = { ...value, gasCostUSD: gasCostUSDAdj };
      finalSignature = await userWallet.signTypedData(domain, types, value2);
      finalGasCostUSD = gasCostUSDAdj;
    }
  } catch (_) {
    // Proceed with current values if refinement fails
  }

  // Submit using relayer/admin wallet with nonce retry on failure
  let tx;
  let retryCount = 0;
  do {
    try {
      tx = await africoin.metaTransfer(from, to, amountWei, currentNonce, deadline, finalGasCostUSD, finalSignature);
      break;
    } catch (err) {
      if (err.reason && err.reason.includes("nonce already used") && retryCount < maxRetries) {
        const next = getNextLocalEthNonce(from);
        console.log(`🔁 submit nonce update: current=${currentNonce}, next=${next}`);
        currentNonce = BigInt(next);
        value.nonce = currentNonce;
        finalSignature = await userWallet.signTypedData(domain, types, value);
        retryCount++;
      } else {
        throw err;
      }
    }
  } while (retryCount <= maxRetries);
  return tx;
}

module.exports = {
  mint,
  addAdmin,
  removeAdmin,
  isAdmin,
  getBalance,
  transfer,
  metaTransfer,
  metaTransferAuto,
  AFRICOIN_ABI // Export the ABI for use in other modules
};