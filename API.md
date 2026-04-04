# Africoin Service API Documentation

## Authentication

All routes require a valid JWT Bearer token in the `Authorization` header.

**Header Example:**
```
Authorization: Bearer <your-jwt-token>
```


Generate a token using:
```sh
node africoin-smart-contract/africoin-service/scripts/generateToken.js
```

---

## Standard Response Format

All responses follow this structure:
```json
{
  "success": true,
  "message": "Descriptive message",
  "data": { /* relevant data or null */ }
}
```

---

## Permission Levels & Private Key Requirements

### 🔑 **Private Key Usage Summary**

| Operation | Private Key Required | Permission Level | Notes |
|-----------|---------------------|------------------|-------|
| **Mint Tokens** | Admin's private key | Admin Only | Admin mints tokens to any address |
| **Add Admin** | Owner's private key | Owner Only | Owner grants admin privileges |
| **Remove Admin** | Owner's private key | Owner Only | Owner revokes admin privileges (ERC20 only) |
| **Transfer Tokens** | Sender's private key | User Operation | Token holder transfers their own tokens |
| **Burn Tokens** | Admin's private key | Admin Only | Admin burns tokens from any address |

### 📝 **Key Definitions**
- **Owner**: The original deployer/controller of the smart contract
- **Admin**: Addresses granted special privileges by the owner (can mint/burn)
- **User**: Any wallet holder who can transfer their own tokens

---

## Routes

### 1. Mint Tokens

**POST** `/api/africoin/mint`

Mint Africoin tokens on AFRi_ERC20 or AFRi_TRC20. **Admin only operation.**

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<admin's private key>",
  "to": "<recipient address>",
  "amount": "<amount in token units>"
}
```

**Important Notes:**
- `privateKey`: Must be the private key of an **admin** (not the recipient)
- `to`: The wallet address that will receive the minted tokens
- For AFRi_TRC20, the private key should not include a leading `0x`
- Only admins can mint tokens

**Response:**
```json
{
  "success": true,
  "message": "Mint successful",
  "data": { "txHash": "<transaction hash>", "explorerUrl": "<blockchain explorer URL>" }
}
```

---

### 2. Add Admin

**POST** `/api/africoin/add-admin`

Add an admin to the Africoin contract. **Owner only operation.**

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<owner's private key>",
  "admin": "<new admin address to be added>"
}
```

**Important Notes:**
- `privateKey`: Must be the private key of the **contract owner** (not an admin)
- `admin`: The wallet address that will be granted admin privileges
- For AFRi_TRC20, the private key should not include a leading `0x`
- Only the contract owner can add new admins

**Response:**
```json
{
  "success": true,
  "message": "Admin added successfully",
  "data": { "txHash": "<transaction hash>", "explorerUrl": "<blockchain explorer URL>" }
}
```

---

### 3. Remove Admin

**POST** `/api/africoin/remove-admin`

Remove an admin from the contract. **Owner only operation (AFRi_ERC20 only).**

**Body:**
```json
{
  "privateKey": "<owner's private key>",
  "admin": "<admin address to be removed>"
}
```

**Important Notes:**
- `privateKey`: Must be the private key of the **contract owner** (not an admin)
- `admin`: The admin address to be removed from admin privileges
- Only available for AFRi_ERC20 blockchain
- Only the contract owner can remove admins

**Response:**
```json
{
  "success": true,
  "message": "Admin removed successfully",
  "data": { "txHash": "<transaction hash>", "explorerUrl": "<blockchain explorer URL>" }
}
```

---

### 4. Check If Address is Admin

**GET** `/api/africoin/is-admin/:address`

Check if an address has admin privileges. **(AFRi_ERC20 only)**

**Response:**
```json
{
  "success": true,
  "message": "Admin status retrieved successfully",
  "data": { "isAdmin": true | false }
}
```

---

### 5. Get Africoin Token Balance (AFRi_ERC20 only)

**GET** `/api/africoin/balance/:address`

Get token balance for a specific address on AFRi_ERC20.

**Response:**
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": { "balance": "<amount>" }
}
```

---

### 6. Create Wallets

**POST** `/api/africoin/create-wallets`

Create one or both wallets (AFRi_ERC20, AFRi_TRC20).

**Body Example:**
```json
{
  "type": "AFRi_ERC20" | "AFRi_TRC20" | null,
  "mnemonic": "<optional seed phrase>"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallets generated successfully",
  "data": {
    "seedPhrase": "<mnemonic>",
    "wallets": [
      {
        "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
        "success": true,
        "address": "<address>",
        "privateKey": "<privateKey>",
        "timestamp": "<timestamp>"
      }
    ]
  }
}
```

---

### 7. Create Wallet (Single)

**GET** `/api/africoin/create-wallet?type=AFRi_ERC20|AFRi_TRC20`

Create a single wallet for the specified blockchain type.

**Response:**
```json
{
  "success": true,
  "message": "Wallet generated successfully",
  "data": {
    "address": "<address>",
    "publicKey": "<publicKey>",
    "network": "<network>",
    "type": "AFRi_ERC20" | "AFRi_TRC20",
    "mnemonic": "<mnemonic>",
    "derivationPath": "<path>",
    "privateKey": "<privateKey>"
  }
}
```

---

### 8. Transfer Tokens

**POST** `/api/africoin/transfer`

Transfer Africoin tokens from one wallet to another. **User operation.**

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<sender's private key>",
  "to": "<recipient address>",
  "amount": "<amount in token units>"
}
```

**Important Notes:**
- `privateKey`: Must be the private key of the **token sender** (the wallet that owns the tokens)
- `to`: The wallet address that will receive the tokens
- The sender must have sufficient token balance and native currency for gas fees
- For AFRi_TRC20, the private key should not include a leading `0x`
- Any wallet holder can transfer their own tokens

**Response:**
```json
{
  "success": true,
  "message": "Transfer successful",
  "data": { "txHash": "<transaction hash>", "explorerUrl": "<blockchain explorer URL>" }
}
```

---

### 9. Get Africoin Token Balance (AFRi_ERC20 or AFRi_TRC20)

**GET** `/api/africoin/wallet/token-balance?blockchain=AFRi_ERC20|AFRi_TRC20&address=<wallet-address>`

Get token balance for a specific address on either blockchain.

**Query Parameters:**
- `blockchain`: `AFRi_ERC20` or `AFRi_TRC20`
- `address`: wallet address

**Response:**
```json
{
  "success": true,
  "message": "Token balance retrieved successfully",
  "data": { "balance": "<amount>" }
}
```

---

### 10. Validate Address

**GET** `/api/africoin/validate-address?blockchain=AFRi_ERC20|AFRi_TRC20&address=<address>`

Validates a wallet address for the specified blockchain.

- `AFRi_ERC20`: Ethereum address validation
- `AFRi_TRC20`: Tron address validation

**Response (valid):**
```json
{
  "success": true,
  "message": "Valid address",
  "data": { "isValid": true }
}
```

**Response (invalid):**
```json
{
  "success": false,
  "message": "Invalid address",
  "data": { "isValid": false }
}
```

---

### 11. Burn Tokens

**POST** `/api/africoin/burn`

Burn (permanently destroy) Africoin tokens from a specified address. **Admin only operation.**

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<admin's private key>",
  "from": "<address to burn tokens from>",
  "amount": "<amount in token units>"
}
```

**Important Notes:**
- `privateKey`: Must be the private key of an **admin** (not the token holder)
- `from`: The wallet address from which tokens will be burned/destroyed
- The specified address must have sufficient token balance
- For AFRi_TRC20, the private key should not include a leading `0x`
- Only admins can burn tokens from any address
- Burned tokens are permanently removed from circulation

**Response:**
```json
{
  "success": true,
  "message": "Burn successful",
  "data": { "txHash": "<transaction hash>", "explorerUrl": "<blockchain explorer URL>" }
}
```

---

### 12. Get Gas Fee Estimate

**GET** `/api/africoin/gas-fee?blockchain=AFRi_ERC20|AFRi_TRC20&type=<operation_type>`

Get estimated gas fee for a specific operation.

**Query Parameters:**
- `blockchain`: `AFRi_ERC20` or `AFRi_TRC20`
- `type`: operation type (e.g., "mint", "transfer", "burn")

**Response:**
```json
{
  "success": true,
  "message": "Gas fee retrieved successfully",
  "data": { "gasFee": "<estimated fee in AFRi tokens>" }
}
```

---

### 13. Get Gas Fees

**GET** `/api/africoin/gas-fees?blockchain=AFRi_ERC20|AFRi_TRC20`

Get current gas fee estimates for the specified blockchain.

**Query Parameters:**
- `blockchain`: `AFRi_ERC20` or `AFRi_TRC20`

**Response (AFRi_ERC20):**
```json
{
  "success": true,
  "message": "Gas fees fetched",
  "data": {
    "blockchain": "AFRi_ERC20",
    "unit": "AFRi_ERC20",
    "fees": {
      "low": { "totalFee": 0.4187 },
      "medium": { "totalFee": 0.8374 },
      "high": { "totalFee": 1.2561 }
    }
  }
}
```

**Response (AFRi_TRC20):**
```json
{
  "success": true,
  "message": "Gas fees fetched",
  "data": {
    "blockchain": "AFRi_TRC20",
    "unit": "AFRi_TRC20",
    "fees": {
      "low": { "totalFee": 0.1008 },
      "medium": { "totalFee": 0.1344 },
      "high": { "totalFee": 0.1344 },
      "urgent": { "totalFee": 0.1344 }
    }
  }
}
```

---

### 14. Get Total Tokens Minted

**GET** `/api/africoin/minted`

Get the cumulative total of all Africoin tokens ever minted on a specific blockchain.

**Query Parameters:**
- `blockchain`: `AFRi_ERC20` or `AFRi_TRC20` (default: `AFRi_ERC20`)

**Response:**
```json
{
  "success": true,
  "message": "Total minted (AFRI)",
  "data": {
    "blockchain": "AFRi_ERC20",
    "totalMinted": "33250.5"
  }
}
```

---

### 15. Get Total Tokens Burned

**GET** `/api/africoin/burned`

Get the cumulative total of all Africoin tokens ever burned on a specific blockchain.

**Query Parameters:**
- `blockchain`: `AFRi_ERC20` or `AFRi_TRC20` (default: `AFRi_ERC20`)

**Response:**
```json
{
  "success": true,
  "message": "Total burned (AFRI)",
  "data": {
    "blockchain": "AFRi_ERC20",
    "totalBurned": "3125.0"
  }
}
```

---

### 16. Get Multiple Wallet Token Balances

**GET** `/api/africoin/wallet/token-balances?AFRi_ERC20=0x...&AFRi_TRC20=T...`

Fetch balances for one or both chains in a single request.

**Query Parameters:**
- `AFRi_ERC20`: Ethereum wallet address (optional)
- `AFRi_TRC20`: Tron wallet address (optional)
- At least one parameter must be provided

**Response (both present):**
```json
{
  "success": true,
  "message": "Token balances retrieved successfully",
  "data": {
    "AFRi_ERC20": { "address": "0x...", "balance": "..." },
    "AFRi_TRC20": { "address": "T...", "balance": "..." }
  }
}
```

**Partial failure example:**
```json
{
  "success": false,
  "message": "Some balances failed: AFRi_TRC20: <error>",
  "data": {
    "AFRi_ERC20": { "address": "0x...", "balance": "..." }
  }
}
```

---

### 17. Get Transaction History

**GET** `/api/africoin/transactions/:address?type=AFRi_ERC20|AFRi_TRC20&page=<page>&size=<size>&fromTime=<iso8601>&toTime=<iso8601>`

Fetch full transaction history for a specific wallet address, including native coin transfers and all token transfers (not limited to AFRI), on Ethereum or Tron.

- **JWT protected**: Requires Authorization header
- **Network-aware**: When `NODE_ENV=test`, explorers and APIs use Sepolia (ETH) and Shasta (TRON)

**Path Parameter:**
- `address`: Wallet address to fetch transfers for (Ethereum or Tron format depending on `type`)

**Query Parameters:**
- `type` (required): `AFRi_ERC20` or `AFRi_TRC20`
- `page` (optional): zero-based page index (default: `0`)
- `size` (optional): page size (default: `20`; max `50` on Tron)
- `fromTime` (optional): ISO 8601 datetime to filter transactions from (inclusive)
- `toTime` (optional): ISO 8601 datetime to filter transactions to (inclusive)

**Behavior & Data Sources:**
- `AFRi_ERC20` (Ethereum): Combines Etherscan `txlist` (native) and `tokentx` (ERC20) for the address. Uses Sepolia endpoints when in test mode.
- `AFRi_TRC20` (Tron): Combines TronGrid `/transactions` (native TRX) and `/transactions/trc20` (all TRC20) for the address. Uses Shasta endpoints when in test mode.

**Response:**
```json
{
  "success": true,
  "message": "Transactions fetched successfully",
  "data": {
    "transactions": [
      {
        "hash": "0x... or <trx-hash>",
        "from": "0x... or T...",
        "to": "0x... or T...",
        "value": "<token amount in human units>",
        "timestamp": 1717622400000,
        "status": "confirmed|failed",
        "network": "ETH|TRX",
        "tokenSymbol": "AFRI",
        "blockNumber": 12345678,
        "explorerUrl": "https://.../tx/<hash>"
      }
    ],
    "pagination": {
      "page": 0,
      "size": 20,
      "total": 42
    }
  }
}
```

**Notes:**
- Results include native transfers and all ERC-20/TRC-20 token transfers for the address (not limited to AFRI only).
- Ensure the following env vars are set for accurate results and rate limits:
  - `CONTRACT_ADDRESS_ETH`, `CONTRACT_ADDRESS_TRON`
  - `ETHERSCAN_API_KEY` (optional but recommended)
  - `TRON_PRO_API_KEY` (optional but recommended)
- Testnet selection is automatic: Sepolia (ETH) and Shasta (TRON) when respective testnet configs are active.

---

### 18. Get Transaction Details by Hash

**GET** `/api/africoin/transactions/hash/:hash?type=AFRi_ERC20|AFRi_TRC20`

Retrieve detailed information for a single transaction on either Ethereum or Tron by providing the transaction hash and blockchain type.

- **JWT protected**: Requires Authorization header
- **Network-aware**: When `NODE_ENV=test`, explorer links and providers use Sepolia (ETH) and Shasta (TRON)

**Path Parameter:**
- `hash`: Transaction hash (0x-prefixed for Ethereum, base58 for Tron)

**Query Parameters:**
- `type` (required): `AFRi_ERC20` or `AFRi_TRC20`

**Behavior & Data Sources:**
- `AFRi_ERC20`: Uses the shared Ethereum provider to fetch both the transaction and its receipt, enriches the response with normalized values (ETH, gwei), confirmation count, logs, and block timestamp fallback.
- `AFRi_TRC20`: Uses the configured TronWalletService to load the transaction and receipt, converts SUN to TRX, includes energy usage, and backfills timestamps from the block header when missing.

**Response:**
```json
{
  "success": true,
  "message": "Transaction fetched successfully",
  "data": {
    "hash": "0x...",
    "blockchain": "AFRi_ERC20",
    "from": "0x...",
    "to": "0x...",
    "value": "0.1234",
    "fee": {
      "maxFeePerGasGwei": "27.45",
      "gasUsed": "21000"
    },
    "status": "confirmed",
    "timestamp": 1718200000000,
    "confirmations": 12,
    "logs": [
      {
        "address": "0x...",
        "topics": ["0xddf..."],
        "data": "0x..."
      }
    ],
    "explorerUrl": "https://.../tx/0x..."
  }
}
```

**Error Cases:**
- Returns `400` when `hash` or `type` are missing, or when the blockchain type is unsupported.
- Returns `404` if the transaction cannot be found on the specified blockchain.
- Returns `500` for unexpected provider or TronGrid failures, preserving the standard error envelope.

---

## Example: Authenticated Request

```sh
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/api/africoin/wallet/token-balance?blockchain=AFRi_TRC20&address=TQz44WVMq7jyy8oJuiq9USDBKgzubP9DDJ"
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```


---
