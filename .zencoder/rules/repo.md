---
description: Repository Information Overview
alwaysApply: true
---

# Africoin Blockchain Service Information

## Summary
The **Africoin Blockchain Service** is a Node.js-based backend application designed to facilitate interactions with the Ethereum and Tron blockchains. It provides a RESTful API for managing **AFRi tokens** (ERC20 on Ethereum and TRC20 on Tron), supporting operations such as minting, burning, token transfers, and meta-transfers (gasless transactions).

## Structure
The repository is organized as a single-project Node.js service:
- **`src/`**: Core application source code (ABI, config, contracts, routes, services).
- **`scripts/`**: Helper scripts for development tasks.
- **`.zencoder/` & `.zenflow/`**: Configuration for automated workflows and AI agent rules.
- **`Dockerfile` & `docker-compose.yml`**: Deployment and containerization configurations.

### Source Code Organization (`src/`)
- **`abi/`**: Contains smart contract ABIs for both Ethereum (`eth/`) and Tron (`tron/`).
- **`config/`**: Configuration for blockchain providers and network settings.
- **`contracts/`**: Solidity source code for the AFRi token contract (`AFRi.sol`).
- **`interfaces/`**: Standard interfaces for wallet and service operations.
- **`middleware/`**: Express middleware, including JWT-based authentication.
- **`routes/`**: API route definitions (e.g., `africoin.js`).
- **`services/`**: Core business logic for blockchain interactions:
    - `africoinService.js`: Ethereum-specific logic using `ethers.js`.
    - `TronAfricoinService.js`: Tron-specific logic using `tronweb`.
    - `EthereumWalletService.js` / `TronWalletService.js`: Wallet management.
- **`utils/`**: Shared utilities like logging and response formatting.
- **`index.js`**: Application entry point.

## Language & Runtime
**Language**: JavaScript (CommonJS)  
**Version**: Node.js 20+ (Targeted via Docker)  
**Build System**: N/A (Standard Node.js)  
**Package Manager**: `npm` (primary), `yarn` (lockfile present)

## Dependencies
**Main Dependencies**:
- **`express`**: Web framework for the API.
- **`ethers`**: Library for interacting with the Ethereum blockchain.
- **`tronweb`**: Library for interacting with the Tron blockchain.
- **`jsonwebtoken`**: Implementation of JSON Web Tokens for authentication.
- **`axios`**: HTTP client for external API calls.
- **`dotenv`**: Environment variable management.
- **`cors`**: Middleware for enabling CORS.

**Development Dependencies**:
- **`nodemon`**: Utility for automatic server restarts during development.

## Build & Installation
```bash
# Install dependencies
npm install

# Start the service
npm start

# Run in development mode with nodemon
npm run dev
```

## Docker

**Dockerfile**: `./Dockerfile`  
**Image**: `africoin-service` (node:20-alpine base)  
**Configuration**: 
- Uses multi-stage builds or optimized production steps (installs only production dependencies).
- Exposes port `3000`.
- Environment variables are loaded from a `.env` file via `docker-compose`.

**Docker Compose**:
```bash
# Build and run the service using Docker Compose
docker-compose up --build
```

## Main Files & Resources
- **`src/index.js`**: The main entry point that initializes the Express server.
- **`src/routes/africoin.js`**: Defines the primary API endpoints for minting, burning, and transfers.
- **`src/contracts/AFRi.sol`**: The core smart contract implementation for the Africoin token.
- **`.env.example`**: (Implicitly required) Should contain `CONTRACT_ADDRESS_ETH`, `CONTRACT_ADDRESS_TRON`, and private keys for administration.

## Testing
**Framework**: No testing framework currently configured (default `test` script placeholder).  
**Test Location**: N/A  
**Naming Convention**: N/A  

**Run Command**:
```bash
npm test
```
