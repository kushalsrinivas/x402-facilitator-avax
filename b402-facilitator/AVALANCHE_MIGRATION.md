# A402 Facilitator - Avalanche C-Chain Migration

This document describes the changes made to convert the B402 facilitator from Binance Smart Chain to Avalanche C-Chain.

## Overview

The facilitator has been adapted to work with Avalanche C-Chain while maintaining the same gasless payment functionality. The service is now called **A402** (Avalanche 402).

## Key Changes

### 1. Network Configuration

**Changed:**

- Chain IDs: `56/97` (BSC) → `43114/43113` (Avalanche)
- RPC endpoints: BSC → Avalanche C-Chain
- Network identifiers: `bsc` → `avalanche`

**New Environment Variables:**

```bash
# Required
RELAYER_PRIVATE_KEY=0x...           # Wallet that pays AVAX gas fees
A402_RELAYER_ADDRESS=0x...          # Relayer contract on Avalanche
NETWORK=mainnet|testnet             # Avalanche mainnet or Fuji testnet

# Optional
AVAX_RPC_URL=...                    # Custom Avalanche RPC
AVAX_TESTNET_RPC_URL=...            # Custom Fuji testnet RPC
SUPABASE_URL=...                    # For logging
SUPABASE_KEY=...                    # For logging
```

### 2. Token Addresses

**Avalanche C-Chain Mainnet:**

- USDT: `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7` (6 decimals)
- USDC: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (6 decimals)
- USDT.e (Bridged): `0xc7198437980c041c805A1EDcbA50c1Ce5db95118` (6 decimals)
- USDC.e (Bridged): `0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664` (6 decimals)

**Fuji Testnet:**

- USDT: `0x9e9ab4D5e5e7D7E7E5e5E5E5E5E5E5E5E5E5E5E5` (placeholder - update with actual address)

### 3. RPC Endpoints

**Mainnet:**

- Default: `https://api.avax.network/ext/bc/C/rpc`
- Chain ID: `43114`

**Testnet (Fuji):**

- Default: `https://api.avax-test.network/ext/bc/C/rpc`
- Chain ID: `43113`

### 4. EIP-712 Domain

The domain separator now uses:

```javascript
{
  name: "A402",           // Changed from "B402"
  version: "1",
  chainId: 43114,         // Avalanche mainnet (or 43113 for testnet)
  verifyingContract: "..." // Your deployed A402 relayer contract
}
```

### 5. API Responses

All API endpoints now return:

- `network: "avalanche"` or `"avalanche-testnet"`
- `facilitator: "a402"`
- `service: "A402 Facilitator"`

## Deployment Steps

### 1. Deploy A402 Relayer Contract

First, you need to deploy the relayer contract on Avalanche C-Chain. The contract should be the same as B402Relayer but deployed on Avalanche.

```bash
# Set your deployer private key
export DEPLOYER_PRIVATE_KEY="0x..."

# Deploy to Fuji testnet
export NETWORK=testnet
npx tsx scripts/deploy-relayer-avalanche.ts

# Deploy to Avalanche mainnet
export NETWORK=mainnet
npx tsx scripts/deploy-relayer-avalanche.ts
```

### 2. Configure Environment

Create a `.env` file:

```env
# Network
NETWORK=mainnet  # or testnet for Fuji

# Relayer Configuration
RELAYER_PRIVATE_KEY=0x...              # Must have AVAX for gas
A402_RELAYER_ADDRESS=0x...             # Deployed contract address

# Optional RPC (use if you have custom endpoints)
AVAX_RPC_URL=https://api.avax.network/ext/bc/C/rpc
AVAX_TESTNET_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Optional Logging
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-key

# Server
PORT=3402
```

### 3. Install and Run

```bash
cd b402-facilitator
npm install
npm run build
npm start
```

## API Endpoints

All endpoints remain the same:

- `GET /` - Service information
- `GET /health` - Health check
- `GET /list` - List supported tokens
- `POST /verify` - Verify payment authorization
- `POST /settle` - Execute payment on-chain
- `GET /metrics` - Prometheus metrics

## Example Usage

### Create Payment Authorization (Client Side)

```typescript
import { ethers } from "ethers";

const domain = {
  name: "A402",
  version: "1",
  chainId: 43114, // Avalanche mainnet
  verifyingContract: "0x...", // A402 relayer address
};

const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

const authorization = {
  from: wallet.address,
  to: recipientAddress,
  value: ethers.parseUnits("10", 6), // 10 USDT (6 decimals)
  validAfter: Math.floor(Date.now() / 1000),
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: ethers.hexlify(ethers.randomBytes(32)),
};

const signature = await wallet.signTypedData(domain, types, authorization);
```

### Verify Payment

```bash
curl -X POST https://your-facilitator.com/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "token": "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      "payload": {
        "authorization": { ... },
        "signature": "0x..."
      }
    },
    "paymentRequirements": {
      "network": "avalanche",
      "relayerContract": "0x..."
    }
  }'
```

## Testing

### Fuji Testnet Resources

- Faucet: https://faucet.avax.network/
- Explorer: https://testnet.snowtrace.io/
- RPC: https://api.avax-test.network/ext/bc/C/rpc

### Test Flow

1. Get testnet AVAX from faucet for your relayer wallet
2. Deploy test tokens or use existing testnet tokens
3. Deploy A402 relayer contract on Fuji
4. Configure facilitator with testnet settings
5. Test verify and settle endpoints

## Differences from B402

### What Changed:

- ✅ Network: BSC → Avalanche C-Chain
- ✅ Chain IDs: 56/97 → 43114/43113
- ✅ Token addresses (native Avalanche tokens)
- ✅ RPC endpoints
- ✅ Domain name in EIP-712: "B402" → "A402"
- ✅ Gas costs (AVAX vs BNB)

### What Stayed the Same:

- ✅ Smart contract ABI (same functions)
- ✅ EIP-712 signature format
- ✅ API endpoints and structure
- ✅ Payment authorization flow
- ✅ Nonce-based replay protection
- ✅ Rate limiting and security features

## Gas Considerations

- Avalanche C-Chain has faster block times (~2 seconds) vs BSC (~3 seconds)
- Gas prices on Avalanche are typically lower than BSC
- The relayer wallet needs AVAX for gas (not BNB)
- Transaction confirmation is faster on Avalanche

## Security Notes

1. **Private Keys**: Never commit private keys. Use environment variables.
2. **Relayer Wallet**: Ensure it always has sufficient AVAX for gas
3. **Contract Verification**: Verify the A402 relayer contract on Snowtrace
4. **Rate Limiting**: The facilitator includes rate limiting (100 req/min)
5. **Monitoring**: Use the `/metrics` endpoint for Prometheus monitoring

## Support

- Avalanche Documentation: https://docs.avax.network/
- Snowtrace Explorer: https://snowtrace.io/
- Testnet Explorer: https://testnet.snowtrace.io/

## Next Steps

1. Deploy A402 relayer contract on Avalanche
2. Update environment variables
3. Deploy facilitator service
4. Test with Fuji testnet first
5. Deploy to mainnet when ready
6. Update client applications to use Avalanche network
