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

Mint Africoin tokens on ETH or TRX.

**Body:**
```json
{
  "type": "ETH" | "TRX",
  "privateKey": "<signer private key>",
  "to": "<recipient address>",
  "amount": "<amount>"
}
```

- For TRX, the private key should not include a leading `0x`.

**Response:**
```json
{
  "success": true,
  "message": "Mint successful",
  "data": { "txHash": "<transaction hash>" }
}
```

---

### 2. Add Admin

**POST** `/api/africoin/add-admin`

Add an admin to the Africoin contract.

**Body:**
```json
{
  "blockchain": "ETH" | "TRX",
  "privateKey": "<signer private key>",
  "admin": "<admin address>"
}
```

- For TRX, the private key should not include a leading `0x`.

**Response:**
```json
{
  "success": true,
  "message": "Admin added successfully",
  "data": { "txHash": "<transaction hash>" }
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
  "data": { "txHash": "<transaction hash>" }
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

### 5. Get Africoin Token Balance (ETH contract)

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

Create one or both wallets (ETH, TRX).

**Body Example:**
```json
{
  "type": "ETH" | "TRX" | null,
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
        "blockchain": "ETH" | "TRX",
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

**GET** `/api/africoin/create-wallet?type=ETH|TRX`

**Response:**
```json
{
  "success": true,
  "message": "Wallet generated successfully",
  "data": {
    "address": "<address>",
    "publicKey": "<publicKey>",
    "network": "<network>",
    "type": "ETH" | "TRX",
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
  "blockchain": "ETH" | "TRX",
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
  "data": { "txHash": "<transaction hash>" }
}
```

---

### 9. Get Africoin Token Balance (ETH or TRX)

**GET** `/api/africoin/wallet/token-balance?type=ETH|TRX&address=<wallet-address>`

**Query Parameters:**
- `type`: `ETH` or `TRX`
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

## Example: Authenticated Request

```sh
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/africoin/wallet/token-balance?type=TRX&address=TQz44WVMq7jyy8oJuiq9USDBKgzubP9DDJ
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