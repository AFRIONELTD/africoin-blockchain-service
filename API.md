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

## Routes

### 1. Mint Tokens

**POST** `/api/africoin/mint`

Mint Africoin tokens on AFRi_ERC20 or AFRi_TRC20.

**Body:**
```json
{
  "type": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<signer private key>",
  "to": "<recipient address>",
  "amount": "<amount>"
}
```

- For AFRi_TRC20, the private key should not include a leading `0x`.

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

Add an admin to the Africoin contract.

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<signer private key>",
  "admin": "<admin address>"
}
```

- For AFRi_TRC20, the private key should not include a leading `0x`.

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

Remove an admin (owner only).

**Body:**
```json
{
  "admin": "<admin address>"
}
```

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

**Response:**
```json
{
  "success": true,
  "message": "Admin status retrieved successfully",
  "data": { "isAdmin": true | false }
}
```

---

### 5. Get Africoin Token Balance (AFRi_ERC20 contract)

**GET** `/api/africoin/balance/:address`

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
    "privateKey": "<privateKey>" // if requested
  }
}
```

---

### 8. Transfer Tokens

**POST** `/api/africoin/transfer`

Transfer Africoin tokens.

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<sender private key>",
  "to": "<recipient address>",
  "amount": "<amount>"
}
```

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

**GET** `/api/africoin/wallet/token-balance?type=AFRi_ERC20|AFRi_TRC20&address=<wallet-address>`

**Query Parameters:**
- `type`: `AFRi_ERC20` or `AFRi_TRC20`
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

**GET** `/api/africoin/validate-address?type=AFRi_ERC20|AFRi_TRC20&address=<address>`

Validates a wallet address for the specified type.

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

### 11. Burn Tokens

**POST** `/api/africoin/burn`

Burn Africoin tokens on AFRi_ERC20 or AFRi_TRC20.

**Body:**
```json
{
  "blockchain": "AFRi_ERC20" | "AFRi_TRC20",
  "privateKey": "<signer private key>",
  "to": "<recipient address>",
  "amount": "<amount>"
}
```

- For AFRi_TRC20, the private key should not include a leading `0x`.

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
- `type`: operation type (e.g., "mint", "transfer")

**Response:**
```json
{
  "success": true,
  "message": "Gas fee retrieved successfully",
  "data": { "gasFee": "<estimated fee>" }
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
    "blockchain": "ETH",
    "unit": "ETH",
    "fees": {
      "low": { "totalFee": 0.0001 },
      "medium": { "totalFee": 0.0002 },
      "high": { "totalFee": 0.0003 }
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
    "blockchain": "TRX",
    "unit": "TRX",
    "fees": {
      "low": { "totalFee": 0.3 },
      "medium": { "totalFee": 0.4 },
      "high": { "totalFee": 0.4 },
      "urgent": { "totalFee": 0.4 }
    }
  }
}
```

---

## Notes on Blockchain Support

- **Admin operations** (add-admin, remove-admin, is-admin) are currently only supported for AFRi_ERC20.
- **Balance endpoint** (`/balance/:address`) is only for AFRi_ERC20. Use `/wallet/token-balance` for both blockchains.
- **Remove admin** requires owner privileges and is only available for AFRi_ERC20.

---

## Example: Authenticated Request

```sh
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/api/africoin/wallet/token-balance?type=AFRi_TRC20&address=TQz44WVMq7jyy8oJuiq9USDBKgzubP9DDJ"
```

---

### 11. Get Multiple Wallet Token Balances

**GET** `/api/africoin/wallet/token-balances?AFRi_ERC20=0x...&AFRi_TRC20=T...`

Fetch balances for one or both chains in a single request.

- Provide at least one of the query parameters.
- Balances are returned in raw token units (as strings).

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

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```