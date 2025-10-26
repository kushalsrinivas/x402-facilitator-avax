# B402 Protocol - Deployment Guide

## 📋 Overview

B402 is a gasless payment protocol for BNB Chain. Users pay USDT without paying gas fees.

## 🏗️ Architecture

### Components

1. **B402Relayer Contract** - Executes gasless USDT transfers
2. **B402Token Contract** - Reward token (already deployed at `0x1573...7Dd`)
3. **Facilitator Service** - Backend that submits transactions
4. **SDK** - Client library for payment authorization
5. **Frontend** - Web UI for users

### How It Works

```
┌─────────┐    1. User signs EIP-712 authorization (0 gas)
│  User   │ ──────────────────────────────────────────┐
└─────────┘                                             │
                                                       ▼
                                     ┌──────────────────────────┐
                                     │  Authorization Message    │
                                     │  - Amount: 1 USDT         │
                                     │  - Recipient: Agent       │
                                     │  - Time window: 10 min    │
                                     │  - Nonce: random          │
                                     └──────────────────────────┘
                                                       │
                                                       ▼
┌──────────────┐  2. User approves USDT  ┌──────────────────────┐
│  SDK/App     │ ────────────────────────▶│  B402Relayer        │
│  (Sign only)│                          │  Contract Address   │
└──────────────┘                          └──────────────────────┘
                                                     
                             3. Submit to facilitator
                                                       │
                                                       ▼
                              ┌────────────────────────────────┐
                              │   Facilitator Service          │
                              │   - Verifies signature         │
                              │   - Pays gas fee               │
                              │   - Executes on-chain          │
                              └────────────────────────────────┘
                                                       │
                                                       ▼
                              ┌────────────────────────────────┐
                              │   On-Chain Transfer            │
                              │   USDT.approve(relayer)        │
                              │   USDT.transferFrom(user→agent) │
                              └────────────────────────────────┘
```

## 🔧 Pre-Deployment Checklist

- [x] B402Token deployed on testnet: `0x157324C3cba4B0F249Eb9171d824bdC9460497Dd`
- [ ] B402Relayer needs deployment
- [ ] Facilitator service needs configuration
- [ ] Test end-to-end flow

## 🚀 Deployment Steps

### Step 1: Deploy B402Relayer to Testnet

```bash
# Navigate to project root
cd /Users/mayurchougule/development/ethereum/b402-protocol

# Install dependencies
npm install

# Deploy relayer (uses DEPLOYER_PRIVATE_KEY from .env)
npx tsx scripts/deploy-relayer.ts
```

**Expected Output:**
- Contract address will be saved to `b402-relayer-deployment.json`
- Save this address for facilitator configuration

### Step 2: Setup Environment Variables

Create `.env` file in `b402-facilitator/`:

```bash
cd b402-facilitator

# Copy example
cp ../.env.example .env

# Edit with your values
nano .env
```

**Required Variables:**
```env
# BSC Testnet
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Relayer (from deployment)
RELAYER_PRIVATE_KEY=your_relayer_private_key
B402_RELAYER_ADDRESS=0x...  # from deployment

# Token addresses
USDT_BSC_TESTNET=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
B402_TOKEN_ADDRESS=0x157324C3cba4B0F249Eb9171d824bdC9460497Dd

# Network
NETWORK=bsc-testnet
PORT=3402
```

### Step 3: Build Services

```bash
# Build SDK
cd b402-sdk
npm install
npm run build

# Build Facilitator
cd ../b402-facilitator
npm install
npm run build
```

### Step 4: Start Facilitator Service

```bash
cd b402-facilitator
npm start
```

**Check health:**
```bash
curl http://localhost:3402/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "b402-facilitator",
  "network": "bsc",
  "relayer": "0x..."
}
```

### Step 5: Test End-to-End

#### Option A: Use Demo Script

```bash
# From project root
npx tsx demo-simple.ts
```

#### Option B: Use Frontend

```bash
# Start frontend server
cd frontend
npm install
npm start

# Open in browser
open http://localhost:3000
```

## 📊 Testnet Deployment Addresses

| Component | Address | Status |
|-----------|---------|--------|
| B402Token | `0x157324C3cba4B0F249Eb9171d824bdC9460497Dd` | ✅ Deployed |
| B402Relayer | `[Deploy first]` | ⏳ Pending |
| USDT | `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` | Testnet |
| Facilitator | `localhost:3402` | ⏳ Local |

## 🔐 Security Notes

1. **Private Keys**: Never commit private keys to git
2. **Environment Files**: Add `.env` to `.gitignore`
3. **Facilitator Key**: Must have sufficient BNB for gas
4. **Approval**: Users must approve USDT before signing

## 🧪 Testing Flow

1. **User** approves 1 USDT to B402Relayer
2. **User** signs EIP-712 authorization (0 gas, wallet popup)
3. **SDK** sends authorization to facilitator service
4. **Facilitator** verifies signature
5. **Facilitator** pays gas and executes transfer
6. **User** receives reward tokens automatically

## 🚀 Mainnet Deployment

Once testnet is verified:

1. Update `.env.mainnet` with mainnet addresses
2. Deploy B402Token to mainnet
3. Deploy B402Relayer to mainnet
4. Configure facilitator for mainnet
5. Launch!

## 📝 Next Steps

1. [ ] Deploy B402Relayer to testnet
2. [ ] Configure facilitator environment
3. [ ] Run end-to-end test
4. [ ] Verify on BSCScan
5. [ ] Deploy to mainnet

