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

// Load Africoin TRC20 ABI from local abi directory to avoid external path dependency
const africoinAbi = require('../abi/tron/africoin.json').abi;
const config = require('../config/provider');
require('dotenv').config();
const { ethers } = require('ethers');

// Local per-address nonce cache to avoid reusing nonces
const tronNonceCache = new Map(); // Map<string, bigint>
function getNextLocalTronNonce(address) {
  const now = BigInt(Date.now()); // ms since epoch; grows monotonically
  const last = tronNonceCache.get(address) ?? -1n;
  let next = now;
  if (next <= last) next = last + 1n;
  tronNonceCache.set(address, next);
  return next;
}

const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
const rawPrivateKey = process.env.COMPANY_TRON_PRIVATE_KEY; // optional default signer for TRON
// Remove 0x prefix for Tron private key if present
const privateKey = rawPrivateKey && rawPrivateKey.startsWith('0x') ? rawPrivateKey.slice(2) : rawPrivateKey;
const contractAddress = process.env.CONTRACT_ADDRESS_TRON;

if (!contractAddress) {
  throw new Error('Missing CONTRACT_ADDRESS_TRON in environment. Please set it in your .env file.');
}

const tronWeb = new TronWeb({
  fullHost: tronNode,
  privateKey
});

// Extract a transaction ID from various TronWeb send() response shapes
function extractTronTxId(res) {
  try {
    if (!res) return null;
    if (typeof res === 'string') return res; // txid as string
    if (Array.isArray(res)) {
      // Some TronWeb versions might return arrays; pick first hex-like 64-char string
      const cand = res.find(x => typeof x === 'string' && /^[0-9a-fA-F]{64}$/.test(x));
      return cand || null;
    }
    if (typeof res === 'object') {
      if (res.txid) return res.txid;
      if (res.txID) return res.txID;
      if (res.transaction && (res.transaction.txID || res.transaction.txid)) return res.transaction.txID || res.transaction.txid;
      if (res.result && (res.result.txid || res.result.txID)) return res.result.txid || res.result.txID;
      if (res.receipt && (res.receipt.txid || res.receipt.txID)) return res.receipt.txid || res.receipt.txID;
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function addAdmin(privateKey, adminAddress) {
  try {
    // Validate inputs
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!adminAddress || typeof adminAddress !== 'string') {
      throw new Error('Invalid admin address provided');
    }

    // Clean private key (remove 0x if present)
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Validate private key length (64 hex characters)
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({
      fullHost: tronNode,
      privateKey: cleanPrivateKey
    });

    // Derive sender address and ensure the instance has it set
    const fromAddress = TronWeb.address.fromPrivateKey(cleanPrivateKey);

    // Validate admin address format
    if (!tw.isAddress(adminAddress)) {
      throw new Error('Invalid Tron address format for admin');
    }

    const contract = await tw.contract(africoinAbi, contractAddress);

    // Convert admin address to hex for contract call
    const adminAddressHex = TronWeb.address.toHex(adminAddress);
    console.log('AddAdmin - Admin hex:', adminAddressHex);

    // Call addAdmin with hex address
    const sendRes = await contract.addAdmin(adminAddressHex).send({
      feeLimit: 100000000, // 100 TRX fee limit
      callValue: 0,
      shouldPollResponse: false,
      from: fromAddress
    });

    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron addAdmin error details:', err);
    throw new Error('Tron addAdmin failed: ' + err.message);
  }
}

async function mint(privateKey, to, amount) {
  try {
    // Validate inputs
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!to || typeof to !== 'string') {
      throw new Error('Invalid recipient address provided');
    }
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }
    
    // Clean private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Validate private key length
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }
    
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ 
      fullHost: tronNode, 
      privateKey: cleanPrivateKey 
    });
    
    // Validate recipient address
    if (!tw.isAddress(to)) {
      throw new Error('Invalid Tron address format for recipient');
    }
    
    const contract = await tw.contract(africoinAbi, contractAddress);
    
    const toHex = TronWeb.address.toHex(to);
    console.log('Mint - To hex:', toHex);

    const sendRes = await contract.mint(toHex, ethers.parseUnits(amount.toString(), 18).toString()).send({
      feeLimit: 1000000000, // 1000 TRX fee limit
      callValue: 0,
      shouldPollResponse: false
    });
    
    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron mint error details:', err);
    throw new Error('Tron mint failed: ' + err.message);
  }
}

async function burn(privateKey, from, amount) {
  try {
    // Validate inputs
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!from || typeof from !== 'string') {
      throw new Error('Invalid from address provided');
    }
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }
    
    // Clean private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Validate private key length
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }
    
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ 
      fullHost: tronNode, 
      privateKey: cleanPrivateKey 
    });
    
    // Validate from address
    if (!tw.isAddress(from)) {
      throw new Error('Invalid Tron address format for from');
    }
    
    const contract = await tw.contract(africoinAbi, contractAddress);
    
    const fromHex = TronWeb.address.toHex(from);
    console.log('Burn - From hex:', fromHex);

    const sendRes = await contract.burnFrom(fromHex, ethers.parseUnits(amount.toString(), 18).toString()).send({
      feeLimit: 1000000000, // 1000 TRX fee limit
      callValue: 0,
      shouldPollResponse: false
    });
    
    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron burn error details:', err);
    throw new Error('Tron burn failed: ' + err.message);
  }
}

// Meta-transfer for Tron TRC20 (contract must expose compatible method)
async function transferMeta({ from, to, amount, nonce, deadline, gasCostUSD, signature }) {
  try {
    if (!from || !to || !amount || nonce === undefined || !deadline || !gasCostUSD || !signature) {
      throw new Error('Missing required meta-transfer fields');
    }

    const amountWei = ethers.parseUnits(amount.toString(), 18).toString();

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const companyPrivateKey = process.env.COMPANY_TRON_PRIVATE_KEY;
    const tw = new TronWeb({
      fullHost: tronNode,
      privateKey: companyPrivateKey || privateKey // Use company key if available for gas payment
    });

    if (!tw.isAddress(to) || !tw.isAddress(from)) {
      throw new Error('Invalid Tron address format');
    }

    // Convert addresses to hex for contract calls
    const fromHex = TronWeb.address.toHex(from);
    const toHex = TronWeb.address.toHex(to);
    console.log('TransferMeta - From hex:', fromHex, 'To hex:', toHex);

    // Check if the from account exists
    try {
      const accountInfo = await tw.trx.getAccount(from);
      if (!accountInfo || !accountInfo.address) {
        console.log('From account does not exist, this might cause issues with meta-transfer');
      }
    } catch (accountErr) {
      console.log('Could not check from account:', accountErr.message);
    }

    const contract = await tw.contract(africoinAbi, contractAddress);

    // Normalize signature for Tron contract call: ensure 0x-prefixed BytesLike
    let sigForContract = signature;
    if (typeof sigForContract !== 'string') {
      throw new Error('Signature must be a string');
    }
    if (!sigForContract.startsWith('0x')) sigForContract = '0x' + sigForContract;
    // Accept 0x-prefixed 65-byte signature (132 chars including 0x)
    if (sigForContract.length !== 132) {
      throw new Error(`Invalid signature length: ${sigForContract.length}, expected 132 (0x + 65 bytes)`);
    }

    const sendRes = await contract.metaTransfer(fromHex, toHex, amountWei, nonce, deadline, gasCostUSD, sigForContract).send({
      feeLimit: 10,
      callValue: 0,
      shouldPollResponse: false
    });

    const txId = extractTronTxId(sendRes);
    return txId || sendRes;
  } catch (err) {
    console.error('Tron meta-transfer error details:', err);
    throw new Error('Tron meta-transfer failed: ' + err.message);
  }
}

// Legacy direct transfer (kept until meta-transfer ABI is finalized)
// Get user nonce from Tron contract
async function getUserNonce(userAddress) {
  try {
    const tw = new TronWeb({
      fullHost: tronNode
      // No private key needed for reads
    });

    // Check if account exists before querying nonce
    let accountInfo;
    try {
      accountInfo = await tw.trx.getAccount(userAddress);
    } catch (accountErr) {
      console.log('Error checking account for nonce:', accountErr.message);
      // If we can't check account, assume it exists and continue
    }

    if (!accountInfo || !accountInfo.address) {
      console.log('Account does not exist on Tron network:', userAddress);
      // Return 0 for non-existent accounts (they haven't transacted yet)
      return 0;
    }

    const contract = await tw.contract(africoinAbi, contractAddress);
    // Convert userAddress to hex for contract call
    const userAddressHex = TronWeb.address.toHex(userAddress);
    const nonce = await contract.getNonce(userAddressHex).call();
    const nonceValue = parseInt(nonce.toString());
    console.log('Fetched nonce for', userAddress, '(hex:', userAddressHex, '):', nonceValue);
    return nonceValue;
  } catch (error) {
    console.log('Failed to fetch nonce for', userAddress, ':', error.message);

    // More comprehensive error handling
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes('account') && errorMsg.includes('does not exist')) {
      console.log('Account does not exist, using nonce 0');
      return 0;
    }
    if (errorMsg.includes('contract') && errorMsg.includes('not found')) {
      console.log('Contract not found, using nonce 0');
      return 0;
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
      console.log('Network error, using nonce 0');
      return 0;
    }

    // For other errors, still return 0 but log the issue
    console.log('Unexpected error fetching nonce, using nonce 0:', error.message);
    return 0;
  }
}

async function getGasFee(type) {
  // Tron uses energy and bandwidth, but for simplicity, return fee limit in TRX
  let fee;
  if (type === 'low') {
    fee = 10; // 10 TRX
  } else if (type === 'medium') {
    fee = 50; // 50 TRX
  } else if (type === 'high') {
    fee = 100; // 100 TRX
  } else {
    throw new Error('Invalid type. Use low, medium, or high.');
  }
  return fee.toString();
}

// Helper function to send TRX for account activation
async function sendActivationTrx(toAddress, trxAmount) {
  try {
    let companyPrivateKey = process.env.COMPANY_TRON_PRIVATE_KEY;
    if (!companyPrivateKey) {
      throw new Error('Company private key not available for activation');
    }
    console.log('Company private key configured:', companyPrivateKey.substring(0, 6) + '...' + companyPrivateKey.substring(58));

    // Clean and validate the private key
    companyPrivateKey = companyPrivateKey.startsWith('0x') ? companyPrivateKey.slice(2) : companyPrivateKey;
    if (companyPrivateKey.length !== 64) {
      throw new Error('Invalid company private key length. Expected 64 hex characters.');
    }
    if (!/^[a-fA-F0-9]{64}$/.test(companyPrivateKey)) {
      throw new Error('Invalid company private key format. Must be 64 hexadecimal characters.');
    }

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({
      fullHost: tronNode,
      privateKey: companyPrivateKey
    });

    // Get company address
    const companyAddress = TronWeb.address.fromPrivateKey(companyPrivateKey);
    console.log(`Company address: ${companyAddress}`);

    // Check company wallet balance
    const companyAccount = await tw.trx.getAccount(companyAddress);
    const companyBalance = (companyAccount.balance || 0) / 1000000; // Convert to TRX
    console.log(`Company wallet balance: ${companyBalance} TRX`);

    if (companyBalance < trxAmount + 0.1) { // Ensure enough for amount plus fees
      throw new Error(`Insufficient TRX in company wallet. Required: ${trxAmount + 0.1}, Available: ${companyBalance}`);
    }

    // Convert TRX to SUN
    const amountInSun = Math.floor(trxAmount * 1000000);

    // Send TRX transaction
    const sendResult = await tw.trx.sendTransaction(toAddress, amountInSun);

    const txId = extractTronTxId(sendResult);
    return txId || sendResult;
  } catch (err) {
    console.error('TRX activation transfer error:', err);
    throw new Error('Failed to send activation TRX: ' + err.message);
  }
}

// Helper function to get transaction error details
async function getTransactionErrorDetails(txId) {
  try {
    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({
      fullHost: tronNode
      // No private key needed for reads
    });

    const txInfo = await tw.trx.getTransactionInfo(txId);
    console.log('📋 Transaction details:');
    console.log('- TX ID:', txId);
    console.log('- Block number:', txInfo.blockNumber || 'Not mined');
    console.log('- Receipt:', txInfo.receipt);

    if (txInfo.receipt) {
      console.log('- Result:', txInfo.receipt.result);
      console.log('- Energy used:', txInfo.receipt.energy_used);
      console.log('- Energy fee:', txInfo.receipt.energy_fee);
      console.log('- Net fee:', txInfo.receipt.net_fee);

      if (txInfo.receipt.result !== 'SUCCESS') {
        console.log('❌ Transaction failed!');
      }
    }

    if (txInfo.contractResult && txInfo.contractResult.length > 0) {
      console.log('- Contract result:', txInfo.contractResult);
    }

    return txInfo;
  } catch (err) {
    console.log('Error getting transaction details:', err.message);
    return null;
  }
}

// Helper function to wait for transaction confirmation
async function waitForTransactionConfirmation(txId, maxWaitSeconds = 30) {
  const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
  const tw = new TronWeb({
    fullHost: tronNode
    // No private key needed for reads
  });

  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const txInfo = await tw.trx.getTransactionInfo(txId);

      if (txInfo && txInfo.receipt) {
        if (txInfo.receipt.result === 'SUCCESS') {
          console.log(`✅ Transaction ${txId} confirmed successfully`);
          return true;
        } else {
          console.log(`❌ Transaction ${txId} failed with result:`, txInfo.receipt.result);
          // Get detailed error info
          await getTransactionErrorDetails(txId);
          return false;
        }
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.log(`Error checking transaction ${txId} status:`, err.message);
      // Continue waiting if there's an error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`⏰ Transaction ${txId} confirmation timeout after ${maxWaitSeconds} seconds`);
  return false;
}

// Auto meta-transfer for Tron with nonce handling and retry logic
async function metaTransferAuto(privateKey, to, amount, bufferBps = 1000) { // 1000 = +10%
  try {
    if (!privateKey || !to || !amount) throw new Error('privateKey, to, and amount are required');

    const amountWei = ethers.parseUnits(amount.toString(), 18);

    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;

    // For meta-transfers: user signs the message, company/relayer pays for gas
    const userPrivateKey = cleanPrivateKey; // User's key for signing the message
    const companyPrivateKey = process.env.COMPANY_TRON_PRIVATE_KEY;

    // Use company key for sending transaction (gas payment), fallback to user key
    const tw = new TronWeb({
      fullHost: tronNode,
      privateKey: companyPrivateKey || userPrivateKey
    });

    const from = TronWeb.address.fromPrivateKey(cleanPrivateKey);
    console.log('User address (from):', from);
    console.log('Recipient address (to):', to);

    if (!tw.isAddress(to)) {
      throw new Error('Invalid Tron address format for recipient');
    }

    // Convert addresses to hex format for contract calls (Tron contracts expect hex addresses)
    const fromHex = TronWeb.address.toHex(from);
    const toHex = TronWeb.address.toHex(to);
    console.log('From address (hex):', fromHex);
    console.log('To address (hex):', toHex);

    // Check if user account exists and has sufficient balance
    let accountExists = false;
    let accountBalance = 0;

    try {
      const accountInfo = await tw.trx.getAccount(from);
      accountExists = !!(accountInfo && accountInfo.address);

      if (accountExists && accountInfo.balance) {
        // Balance is in SUN (1 TRX = 1,000,000 SUN)
        accountBalance = accountInfo.balance / 1000000; // Convert to TRX
        console.log(`User account exists with balance: ${accountBalance} TRX`);
      } else {
        console.log('User account does not exist');
      }
    } catch (err) {
      console.log('Error checking account existence/balance:', err.message);
    }

    // Ensure sender has at least 1.1 TRX balance
    if (!accountExists || accountBalance < 1.1) {
      const trxToSend = accountExists ? (1.1 - accountBalance) : 1.1;
      console.log(`Sender needs ${trxToSend.toFixed(2)} TRX to reach minimum balance of 1.1 TRX`);

      if (companyPrivateKey) {
        try {
          console.log(`Sending ${trxToSend.toFixed(2)} TRX to sender from company wallet...`);
          const activationTxId = await sendActivationTrx(from, trxToSend);
          console.log('Sender top-up transaction sent:', activationTxId);

          // Wait for transaction to be confirmed
          console.log('Waiting for sender top-up confirmation...');
          await waitForTransactionConfirmation(activationTxId, 30); // Wait up to 30 seconds
          console.log('Sender top-up confirmed');

          // Update balance
          accountBalance += trxToSend;
          console.log(`✅ Sender balance now: ${accountBalance} TRX`);
        } catch (activationErr) {
          console.log('⚠️ Sender top-up failed:', activationErr.message);
          throw new Error('Failed to top-up sender account: ' + activationErr.message);
        }
      } else {
        throw new Error('Company private key not available for sender top-up');
      }
    }

    // Check if recipient account exists and has TRX balance
    console.log('🔍 Checking recipient account status...');
    let toAccountExists = false;
    let toAccountBalance = 0;
    try {
      const toAccountInfo = await tw.trx.getAccount(to);
      toAccountExists = !!(toAccountInfo && toAccountInfo.address);
      if (toAccountExists && toAccountInfo.balance) {
        toAccountBalance = toAccountInfo.balance / 1000000; // Convert to TRX
      }
      console.log(`Recipient account exists: ${toAccountExists}, balance: ${toAccountBalance} TRX`);
    } catch (err) {
      console.log('⚠️ Error checking recipient account:', err.message);
    }

    // Ensure recipient has at least 1.1 TRX balance
    if (!toAccountExists || toAccountBalance < 1.1) {
      const trxToSend = toAccountExists ? (1.1 - toAccountBalance) : 1.1;
      console.log(`Recipient needs ${trxToSend.toFixed(2)} TRX to reach minimum balance of 1.1 TRX`);

      if (companyPrivateKey) {
        try {
          console.log(`Sending ${trxToSend.toFixed(2)} TRX to recipient from company wallet...`);
          const activationTxId = await sendActivationTrx(to, trxToSend);
          console.log('✅ Recipient top-up transaction sent:', activationTxId);

          // Wait for activation confirmation
          console.log('⏳ Waiting for recipient top-up confirmation...');
          await waitForTransactionConfirmation(activationTxId, 30);
          console.log('✅ Recipient account top-up confirmed!');

          // Update balance
          toAccountBalance += trxToSend;
          console.log(`✅ Recipient balance now: ${toAccountBalance} TRX`);
        } catch (activationErr) {
          console.log('⚠️ Recipient top-up failed:', activationErr.message);
          throw new Error('Failed to top-up recipient account: ' + activationErr.message);
        }
      } else {
        throw new Error('Company private key not available for recipient top-up');
      }
    }

    // Proceed with meta-transfer
    console.log('🔄 Executing meta-transfer...');

    // Determine nonce via local cache to ensure monotonic uniqueness
    // Using ms timestamp ensures strict growth and avoids re-use across rapid calls or multi-instance
    let nonceBig = getNextLocalTronNonce(from);
    console.log(`🧮 Local nonce chosen for ${from}: ${nonceBig}`);
    const nonce = Number(nonceBig);

    const deadline = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes
    console.log(`⏰ Current time: ${Math.floor(Date.now() / 1000)}`);
    console.log(`⏰ Deadline: ${deadline} (in ${deadline - Math.floor(Date.now() / 1000)} seconds)`);

    // Estimate gas cost in USD (TRX = ~$0.10, AFRi = $1)
    const trxUsdStr = process.env.TRX_USD_PRICE || '0.10';
    const trxUsd = Number(trxUsdStr);
    if (!trxUsd || trxUsd <= 0) throw new Error('Invalid TRX_USD_PRICE');

    // Conservative gas limit for meta transfer (similar to ETH)
    const assumedGasLimit = 1000000; // TRX units
    const trxCost = assumedGasLimit / 1000000; // Convert sun to TRX
    let gasCostUSDNumber = trxCost * trxUsd;
    gasCostUSDNumber = gasCostUSDNumber * (1 + bufferBps / 10000); // add buffer

    // Convert to AFRi token units using ethers.parseUnits to avoid JS number overflow
    const gasCostUSD = (() => {
      const decimalsEnv = process.env.AFRI_TRON_DECIMALS || '18';
      const d = parseInt(decimalsEnv, 10);
      // Use up to 6 decimals precision for the USD float before scaling
      const usdStr = gasCostUSDNumber.toFixed(6);
      return ethers.parseUnits(usdStr, d); // returns BigInt
    })();

    // Build EIP-712 domain verifyingContract from TRON contract address
    const verifyingContractEthLike = (() => {
      let addr = contractAddress;
      // If base58 'T...' → hex '41...'
      if (/^T/.test(addr)) {
        addr = TronWeb.address.toHex(addr);
      }
      // If '41...' → '0x...'
      if (/^41/i.test(addr)) {
        addr = '0x' + addr.slice(2);
      }
      // If already '0x...', keep it
      return addr.toLowerCase();
    })();

    // Determine TRON chainId (strict). Allow toggling via env; infer Shasta by URL; otherwise require explicit env
    const chainId = (() => {
      const env = process.env.TRON_CHAIN_ID;
      if (env) {
        // Accept numeric strings; map common aliases
        const trimmed = String(env).trim();
        if (/^\d+$/.test(trimmed)) return Number(trimmed);
        const lower = trimmed.toLowerCase();
        if (lower === 'shasta' || lower === 'testnet') return 2494104990;
        // Do NOT guess mainnet number; require explicit numeric value for safety
        throw new Error(`Invalid TRON_CHAIN_ID value: ${env}. Use a numeric chain id (e.g., 2494104990 for Shasta).`);
      }
      if ((tronNode || '').toLowerCase().includes('shasta')) return 2494104990; // Shasta
      if ((tronNode || '').toLowerCase().includes('trongrid.io')) {
        // Likely mainnet if not shasta; require explicit TRON_CHAIN_ID to avoid mismatches
        throw new Error('TRON_CHAIN_ID not set. Detected non-Shasta node; set numeric TRON_CHAIN_ID in .env (mainnet).');
      }
      throw new Error('TRON_CHAIN_ID not set and network not recognized. Set numeric TRON_CHAIN_ID in .env');
    })();

    const domain = {
      name: 'AFRi',
      version: '1',
      chainId,
      verifyingContract: verifyingContractEthLike
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

    // Convert 41.. addresses to 0x.. for EIP-712 typed-data signing
    const from0x = /^41/i.test(fromHex) ? ('0x' + fromHex.slice(2)) : fromHex;
    const to0x   = /^41/i.test(toHex)   ? ('0x' + toHex.slice(2))   : toHex;

    const value = {
      from: from0x,
      to: to0x,
      amount: BigInt(amountWei),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
      gasCostUSD: BigInt(gasCostUSD)
    };

    // Use ethers to sign typed data with the user's Tron private key
    const { Wallet } = require('ethers');
    const userWallet = new Wallet('0x' + userPrivateKey);
    let finalSignature = await userWallet.signTypedData(domain, types, value);
    if (!finalSignature.startsWith('0x')) finalSignature = '0x' + finalSignature;
    console.log(`🔐 EIP-712 signature (${finalSignature.length} chars): ${finalSignature.substring(0, 20)}...`);

    // Accept 0x-prefixed (132) or raw (130); normalize to 0x-prefixed 132
    if (finalSignature.length !== 132 && finalSignature.length !== 130) {
      throw new Error(`Invalid signature length: ${finalSignature.length}, expected 130 or 132`);
    }
    if (finalSignature.length === 130) finalSignature = '0x' + finalSignature;

    console.log(`🔐 Final signature (${finalSignature.length} chars): ${finalSignature.substring(0, 20)}...`);

    const contract = await tw.contract(africoinAbi, contractAddress);

    // Verify contract has metaTransfer method
    if (!contract.metaTransfer || typeof contract.metaTransfer !== 'function') {
      throw new Error('Contract does not have metaTransfer method. Please check contract ABI and address.');
    }

    console.log('✅ Contract has metaTransfer method, proceeding...');
    console.log(`📍 Contract address: ${contractAddress}`);
    console.log(`🌐 Tron node: ${tronNode}`);

    // Handle nonce conflicts with retry
    const maxRetries = 5;
    let currentNonce = nonce;
    let currentSignature = finalSignature;

    // Pre-flight: refresh nonce from chain in case another tx consumed it
    try {
      const freshNonce = await getUserNonce(from);
      if (Number.isFinite(freshNonce) && freshNonce > Number(currentNonce)) {
        console.log(`🔁 Pre-flight nonce refresh: ${currentNonce} -> ${freshNonce}`);
        currentNonce = freshNonce;
        const valueResign0 = { ...value, nonce: BigInt(currentNonce) };
        let newSig0 = await userWallet.signTypedData(domain, types, valueResign0);
        if (!newSig0.startsWith('0x')) newSig0 = '0x' + newSig0;
        if (newSig0.length !== 132) {
          throw new Error(`Re-signed signature invalid length: ${newSig0.length}`);
        }
        currentSignature = newSig0;
      }
    } catch (preErr) {
      console.log('Pre-flight nonce refresh failed (continuing with current nonce):', preErr.message);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 Meta-transfer attempt ${attempt + 1}/${maxRetries}`);
        console.log('📊 Parameters:');
        console.log(`   - from: ${from} (hex: ${fromHex})`);
        console.log(`   - to: ${to} (hex: ${toHex})`);
        console.log(`   - amount: ${amountWei.toString()}`);
        console.log(`   - nonce: ${currentNonce}`);
        console.log(`   - deadline: ${deadline}`);
        console.log(`   - gasCostUSD: ${gasCostUSD}`);
        console.log(`   - signature length: ${currentSignature.length}`);
        console.log(`   - signature starts with: ${currentSignature.substring(0, 4)}`);
        console.log(`   - current time: ${Math.floor(Date.now() / 1000)}`);
        console.log(`   - time until deadline: ${deadline - Math.floor(Date.now() / 1000)} seconds`);

        // Additional validation before calling
        if (deadline <= Math.floor(Date.now() / 1000)) {
          throw new Error(`Deadline has expired! Current time: ${Math.floor(Date.now() / 1000)}, Deadline: ${deadline}`);
        }

        // Normalize signature to 0x-prefixed BytesLike for contract call
        let sigForContract = currentSignature;
        if (typeof sigForContract !== 'string') {
          throw new Error('Signature must be a string');
        }
        if (!sigForContract.startsWith('0x')) sigForContract = '0x' + sigForContract;
        if (sigForContract.length !== 132) {
          throw new Error(`Invalid signature length: ${sigForContract.length}, expected 132 (0x + 65 bytes)`);
        }

        console.log('🚀 Calling metaTransfer contract method...');

        // Try to call metaTransfer with hex addresses
        const sendRes = await contract.metaTransfer(
          fromHex,
          toHex,
          amountWei.toString(), // string is fine for uint256
          BigInt(currentNonce),
          BigInt(deadline),
          gasCostUSD, // BigInt
          sigForContract
        ).send({
          feeLimit: 100000000, // Increased to 100 TRX to handle energy costs for larger amount data
          callValue: 0,
          shouldPollResponse: false
        });

        console.log('✅ Contract call successful, response:', sendRes);

        const txId = extractTronTxId(sendRes);
        return txId || sendRes;
      } catch (err) {
        console.error('Tron meta-transfer attempt', attempt + 1, 'error details:');
        console.error('- Error message:', err.message);
        console.error('- Error code:', err.code);
        console.error('- Error data:', err.data);
        console.error('- Full error object:', JSON.stringify(err, null, 2));

        // Try to get more transaction details if possible
        let failedTxId = null;
        if (err.transaction && err.transaction.txID) {
          failedTxId = err.transaction.txID;
          console.error('- Transaction ID:', failedTxId);
        } else if (err.txID) {
          failedTxId = err.txID;
          console.error('- Transaction ID:', failedTxId);
        }

        // If we have a transaction ID, get detailed error info
        if (failedTxId) {
          console.log('🔍 Getting detailed transaction error information...');
          await getTransactionErrorDetails(failedTxId);
        }

        // Check for common Tron-specific errors
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes('revert')) {
          console.error('🚨 CONTRACT REVERT DETECTED - This usually means:');
          console.error('   - Account still not activated properly');
          console.error('   - Insufficient TRX balance for fees');
          console.error('   - Contract logic rejecting the transaction');
          console.error('   - Invalid parameters or signature');
        }

        // Check if nonce error (need to detect "nonce already used" in Tron)
        {
          const errText = [err?.message, err?.code, err?.data, (() => { try { return JSON.stringify(err); } catch { return ''; } })()]
            .filter(Boolean)
            .join(' | ')
            .toLowerCase();

          if (errText.includes('nonce') || errText.includes('already used') || errText.includes('invalid nonce')) {
            if (attempt < maxRetries - 1) {
              console.log('Detected nonce issue, picking a higher local nonce and re-signing...');
              const nextLocal = getNextLocalTronNonce(from);
              console.log(`🔁 Local nonce update: ${currentNonce} -> ${nextLocal}`);
              currentNonce = Number(nextLocal);
              const valueResign = { ...value, nonce: BigInt(currentNonce) };
              let newSig = await userWallet.signTypedData(domain, types, valueResign);
              if (!newSig.startsWith('0x')) newSig = '0x' + newSig;
              if (newSig.length !== 132) {
                throw new Error(`Re-signed signature invalid length: ${newSig.length}`);
              }
              currentSignature = newSig;
              console.log(`🔄 Regenerated EIP-712 signature for nonce ${currentNonce}: ${currentSignature.substring(0, 20)}...`);
              // Continue loop to retry
              continue;
            }
          }
        }

        // Other error or max retries reached, throw with more details
        if (attempt === maxRetries - 1) {
          const detailedError = `Tron meta-transfer failed after ${maxRetries} retries. Last error: ${err.message}`;
          console.error('🚨 MAX RETRIES REACHED:', detailedError);

          // Try to provide helpful suggestions
          if (errorMsg.includes('revert') || errorMsg.includes('account')) {
            console.error('💡 SUGGESTIONS:');
            console.error('   1. Check if account has enough TRX (>1 TRX for fees)');
            console.error('   2. Verify contract address and ABI are correct');
            console.error('   3. Ensure metaTransfer method exists on contract');
            console.error('   4. Check signature validity');
          }

          throw new Error(detailedError);
        }
        throw err;
      }
    }
  } catch (err) {
    console.error('Tron metaTransferAuto error details:', err);
    throw new Error('Tron meta-transfer failed: ' + err.message);
  }
}

// Enhanced direct transfer with automatic account activation
async function transfer(privateKey, to, amount) {
  try {
    if (!privateKey || typeof privateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }
    if (!to || typeof to !== 'string') {
      throw new Error('Invalid recipient address provided');
    }
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }

    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ fullHost: tronNode, privateKey: cleanPrivateKey });

    if (!tw.isAddress(to)) {
      throw new Error('Invalid Tron address format for recipient');
    }

    const from = TronWeb.address.fromPrivateKey(cleanPrivateKey);
    console.log('🚀 Starting Tron transfer...');
    console.log('From:', from);
    console.log('To:', to);
    console.log('Amount:', amount);

    // Check if account needs activation
    console.log('🔍 Checking account status...');
    let accountExists = false;
    let hasSufficientBalance = false;
    let accountBalance = 0;

    try {
      const accountInfo = await tw.trx.getAccount(from);
      accountExists = !!(accountInfo && accountInfo.address);

      if (accountExists && accountInfo.balance) {
        accountBalance = accountInfo.balance / 1000000; // Convert SUN to TRX
        hasSufficientBalance = accountBalance >= 1.1;
        console.log(`✅ Account exists with balance: ${accountBalance} TRX`);
      } else {
        console.log('❌ Account does not exist or has no balance');
      }
    } catch (err) {
      console.log('⚠️ Error checking account:', err.message);
    }

    // Activate account if needed (only if account doesn't exist)
    if (!accountExists) {
      const companyPrivateKey = process.env.COMPANY_TRON_PRIVATE_KEY;
      if (!companyPrivateKey) {
        throw new Error('Company wallet not configured for account activation');
      }

      console.log('🔄 Account needs activation, sending 1.1 TRX...');

      try {
        const activationTxId = await sendActivationTrx(from, 1.1);
        console.log('✅ Activation TRX sent:', activationTxId);

        // Wait for activation confirmation
        console.log('⏳ Waiting for activation confirmation...');
        const confirmed = await waitForTransactionConfirmation(activationTxId, 30);

        if (!confirmed) {
          console.log('⚠️ Activation transaction may not have confirmed, proceeding anyway...');
        } else {
          console.log('✅ Account activation confirmed!');
        }

        // Brief pause to ensure network consistency
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (activationErr) {
        console.log('⚠️ Activation failed, but proceeding with transfer:', activationErr.message);
      }
    } else {
      console.log('✅ Account already activated, proceeding with transfer...');
    }

    // Check energy requirements before transfer
    console.log('🔋 Checking energy requirements...');
    try {
      const accountResources = await tw.trx.getAccountResources(from);
      const energyLimit = accountResources.EnergyLimit || 0;
      const energyUsed = accountResources.EnergyUsed || 0;
      const availableEnergy = energyLimit - energyUsed;

      console.log(`Energy Status - Available: ${availableEnergy}, Limit: ${energyLimit}, Used: ${energyUsed}`);

      if (availableEnergy < 10000) {
        console.log('⚠️ Low energy detected, increasing fee limit to cover energy costs...');
      }
    } catch (energyErr) {
      console.log('⚠️ Could not check energy, proceeding with increased fee limit:', energyErr.message);
    }

    // Check if recipient account exists and has TRX balance
    console.log('🔍 Checking recipient account status...');
    let toAccountExists = false;
    let toAccountBalance = 0;
    try {
      const toAccountInfo = await tw.trx.getAccount(to);
      toAccountExists = !!(toAccountInfo && toAccountInfo.address);
      if (toAccountExists && toAccountInfo.balance) {
        toAccountBalance = toAccountInfo.balance / 1000000; // Convert to TRX
      }
      console.log(`Recipient account exists: ${toAccountExists}, balance: ${toAccountBalance} TRX`);
    } catch (err) {
      console.log('⚠️ Error checking recipient account:', err.message);
    }

    // If recipient account doesn't exist or has 0 TRX balance, send 1.1 TRX
    if (!toAccountExists || toAccountBalance === 0) {
      console.log('Recipient account does not exist or has 0 TRX, sending 1.1 TRX...');
      try {
        const activationTxId = await sendActivationTrx(to, 1.1);
        console.log('✅ Activation TRX sent to recipient:', activationTxId);
        // Wait briefly
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (activationErr) {
        console.log('⚠️ Recipient activation/top-up failed, proceeding anyway:', activationErr.message);
      }
    }

    // Execute the token transfer with sufficient energy
    console.log('💰 Executing AFRi token transfer...');
    const contract = await tw.contract(africoinAbi, contractAddress);

    // Convert address to hex for contract call
    const toHex = TronWeb.address.toHex(to);
    console.log('Transfer - To hex:', toHex);

    // Use very high feeLimit to ensure sufficient energy (100 TRX)
    console.log('🔄 Executing transfer with high energy allocation...');
    const sendRes = await contract.transfer(toHex, ethers.parseUnits(amount.toString(), 18).toString()).send({
      feeLimit: 100000000, // Increased to 100 TRX to cover all energy costs for larger amount data
      callValue: 0,
      shouldPollResponse: false
    });
    console.log('✅ Transfer successful with high energy allocation!');

    const txId = extractTronTxId(sendRes);
    console.log('✅ Transfer successful! TX ID:', txId);
    return txId || sendRes;

  } catch (err) {
    console.error('❌ Tron transfer error:', err.message);
    console.error('Full error details:', err);
    throw new Error('Tron transfer failed: ' + err.message);
  }
}

// Debug function to check energy and account status
async function debugTronAccount(privateKey) {
  try {
    console.log('🔍 Debugging Tron account status...');

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ fullHost: tronNode, privateKey: privateKey });

    const address = TronWeb.address.fromPrivateKey(privateKey);

    console.log('📍 Account Address:', address);

    // Get account info
    const accountInfo = await tw.trx.getAccount(address);
    console.log('💰 Account Balance:', (accountInfo.balance || 0) / 1000000, 'TRX');

    // Get account resources
    const resources = await tw.trx.getAccountResources(address);
    console.log('🔋 Energy Limit:', resources.EnergyLimit || 0);
    console.log('⚡ Energy Used:', resources.EnergyUsed || 0);
    console.log('📊 Available Energy:', (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0));
    console.log('💾 Bandwidth Limit:', resources.freeNetLimit || 0);
    console.log('📤 Bandwidth Used:', resources.freeNetUsed || 0);

    // Check if account can execute TRC20 transfer
    const contract = await tw.contract(africoinAbi, contractAddress);
    console.log('🎯 Contract Address:', contractAddress);

    return {
      address,
      balance: (accountInfo.balance || 0) / 1000000,
      energyLimit: resources.EnergyLimit || 0,
      energyUsed: resources.EnergyUsed || 0,
      availableEnergy: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0),
      bandwidthLimit: resources.freeNetLimit || 0,
      bandwidthUsed: resources.freeNetUsed || 0
    };

  } catch (err) {
    console.error('❌ Debug failed:', err.message);
    throw new Error('Debug failed: ' + err.message);
  }
}

// Acquire energy for an account by freezing TRX
async function acquireEnergy(privateKey, trxToFreeze = 100) {
  try {
    console.log(`🔋 Acquiring energy by freezing ${trxToFreeze} TRX...`);

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ fullHost: tronNode, privateKey: privateKey });

    const from = TronWeb.address.fromPrivateKey(privateKey);
    const freezeAmount = trxToFreeze * 1000000; // Convert to SUN

    // Freeze TRX to get energy (resource: 1 = energy)
    const freezeTx = await tw.trx.freezeBalance(freezeAmount, 3, 'ENERGY', from);

    console.log('✅ Energy acquisition successful! TX ID:', freezeTx.txID);
    return freezeTx.txID;
  } catch (err) {
    console.error('❌ Energy acquisition failed:', err.message);
    throw new Error('Failed to acquire energy: ' + err.message);
  }
}

// Alternative: Transfer with maximum energy allocation
async function transferWithMaxEnergy(userPrivateKey, to, amount) {
  try {
    console.log('⚡ Executing transfer with maximum energy allocation...');

    // Validate inputs
    if (!userPrivateKey || typeof userPrivateKey !== 'string') {
      throw new Error('Invalid user private key provided');
    }
    if (!to || typeof to !== 'string') {
      throw new Error('Invalid recipient address provided');
    }
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }

    const cleanPrivateKey = userPrivateKey.startsWith('0x') ? userPrivateKey.slice(2) : userPrivateKey;
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length. Expected 64 hex characters.');
    }

    const tronNode = process.env.TRON_RPC_URL || config.blockchain.tronRpcUrl;
    const tw = new TronWeb({ fullHost: tronNode, privateKey: cleanPrivateKey });

    if (!tw.isAddress(to)) {
      throw new Error('Invalid Tron address format for recipient');
    }

    const from = TronWeb.address.fromPrivateKey(cleanPrivateKey);
    console.log('🚀 Starting maximum energy transfer...');
    console.log('From:', from);
    console.log('To:', to);
    console.log('Amount:', amount);

    // Check and activate account if needed
    console.log('🔍 Checking account status...');
    let accountExists = false;
    let hasSufficientBalance = false;

    try {
      const accountInfo = await tw.trx.getAccount(from);
      accountExists = !!(accountInfo && accountInfo.address);

      if (accountExists && accountInfo.balance) {
        const accountBalance = accountInfo.balance / 1000000;
        hasSufficientBalance = accountBalance >= 1.1;
        console.log(`✅ Account exists with balance: ${accountBalance} TRX`);
      } else {
        console.log('❌ Account does not exist or has no balance');
      }
    } catch (err) {
      console.log('⚠️ Error checking account:', err.message);
    }

    // Activate account if needed (only if account doesn't exist)
    if (!accountExists) {
      console.log('🔄 Account needs activation, sending 1.1 TRX...');
      try {
        const activationTxId = await sendActivationTrx(from, 1.1);
        console.log('✅ Activation TRX sent:', activationTxId);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for confirmation
      } catch (activationErr) {
        console.log('⚠️ Activation failed, proceeding anyway:', activationErr.message);
      }
    }

    // Check if recipient account exists and has TRX balance
    console.log('🔍 Checking recipient account status...');
    let toAccountExists = false;
    let toAccountBalance = 0;
    try {
      const toAccountInfo = await tw.trx.getAccount(to);
      toAccountExists = !!(toAccountInfo && toAccountInfo.address);
      if (toAccountExists && toAccountInfo.balance) {
        toAccountBalance = toAccountInfo.balance / 1000000; // Convert to TRX
      }
      console.log(`Recipient account exists: ${toAccountExists}, balance: ${toAccountBalance} TRX`);
    } catch (err) {
      console.log('⚠️ Error checking recipient account:', err.message);
    }

    // If recipient account doesn't exist or has 0 TRX balance, send 1.1 TRX
    if (!toAccountExists || toAccountBalance === 0) {
      console.log('Recipient account does not exist or has 0 TRX, sending 1.1 TRX...');
      try {
        const activationTxId = await sendActivationTrx(to, 1.1);
        console.log('✅ Activation TRX sent to recipient:', activationTxId);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (activationErr) {
        console.log('⚠️ Recipient activation/top-up failed, proceeding anyway:', activationErr.message);
      }
    }

    // Execute transfer with maximum energy allocation
    console.log('💰 Executing AFRi token transfer with maximum energy...');
    const contract = await tw.contract(africoinAbi, contractAddress);

    // Try with extremely high feeLimit to ensure energy availability
    let sendRes;
    try {
      console.log('🔄 Attempting transfer with 50 TRX feeLimit...');
      sendRes = await contract.transfer(to, amount).send({
        feeLimit: 50000000, // 50 TRX - maximum energy allocation
        callValue: 0,
        shouldPollResponse: false
      });
      console.log('✅ Transfer successful with 50 TRX feeLimit!');
    } catch (firstErr) {
      console.log('⚠️ 50 TRX feeLimit failed:', firstErr.message);

      // Try with even higher limit as last resort
      console.log('🔄 Attempting transfer with 100 TRX feeLimit as last resort...');
      sendRes = await contract.transfer(to, amount).send({
        feeLimit: 100000000, // 100 TRX - emergency energy allocation
        callValue: 0,
        shouldPollResponse: false
      });
      console.log('✅ Transfer successful with 100 TRX feeLimit!');
    }

    const txId = extractTronTxId(sendRes);
    console.log('✅ Transfer successful with maximum energy! TX ID:', txId);
    return txId || sendRes;

  } catch (err) {
    console.error('❌ Maximum energy transfer error:', err.message);
    console.error('Full error details:', err);
    throw new Error('Maximum energy transfer failed: ' + err.message);
  }
}

// Simple transfer with automatic activation (recommended approach)
async function transferWithActivation(privateKey, to, amount) {
  console.log('🔄 Using enhanced Tron transfer with automatic account activation and maximum energy...');
  return await transferWithMaxEnergy(privateKey, to, amount);
}

// Test function for transfer route verification
async function testTransferWithActivation() {
  console.log('🧪 Testing Tron transfer with automatic activation...');

  // Test parameters (replace with actual values for testing)
  const testPrivateKey = process.env.TEST_TRON_PRIVATE_KEY || 'your_test_private_key_here';
  const testToAddress = process.env.TEST_TRON_TO_ADDRESS || 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9';
  const testAmount = process.env.TEST_TRON_AMOUNT || '1000000000000000000'; // 1 AFRi token

  if (testPrivateKey === 'your_test_private_key_here') {
    console.log('⚠️ Please set TEST_TRON_PRIVATE_KEY environment variable for testing');
    return;
  }

  try {
    const result = await transferWithActivation(testPrivateKey, testToAddress, testAmount);
    console.log('✅ Test successful! TX ID:', result);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

module.exports = {
  mint,
  burn,
  addAdmin,
  getGasFee,
  transferMeta,
  metaTransferAuto,
  transfer,
  transferWithActivation, // New recommended function
  transferWithMaxEnergy, // Maximum energy transfer function
  testTransferWithActivation, // Test function
  acquireEnergy, // Energy management function
  debugTronAccount, // Debug function
  mint,
  getUserNonce,
};