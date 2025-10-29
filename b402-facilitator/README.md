# A402 Facilitator - Avalanche C-Chain Gasless Payments

A facilitator service that enables gasless token payments on Avalanche C-Chain. Users can send USDT, USDC, and other tokens without holding AVAX for gas fees.

## Overview

The A402 Facilitator is an Express-based API service that:

- ✅ Verifies EIP-712 payment signatures
- ✅ Executes gasless token transfers on Avalanche C-Chain
- ✅ Supports multiple tokens (USDT, USDC, USDT.e, USDC.e)
- ✅ Covers gas fees for users (relayer pays in AVAX)
- ✅ Provides monitoring via Prometheus metrics
- ✅ Includes rate limiting and security features

## Quick Start

### 1. Installation

```bash
cd b402-facilitator
npm install
```

### 2. Configuration

Create a `.env` file (see `.env.example`):

```env
# Required
NETWORK=testnet
RELAYER_PRIVATE_KEY=0x...
A402_RELAYER_ADDRESS=0x...

# Optional
AVAX_RPC_URL=https://api.avax.network/ext/bc/C/rpc
SUPABASE_URL=...
SUPABASE_KEY=...
PORT=3402
```

### 3. Run the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The service will start on `http://localhost:3402`

## Network Information

### Avalanche C-Chain Mainnet

- Chain ID: `43114`
- RPC: `https://api.avax.network/ext/bc/C/rpc`
- Explorer: https://snowtrace.io/

### Avalanche Fuji Testnet

- Chain ID: `43113`
- RPC: `https://api.avax-test.network/ext/bc/C/rpc`
- Explorer: https://testnet.snowtrace.io/
- Faucet: https://faucet.avax.network/

## Supported Tokens

### Mainnet (Chain ID: 43114)

- **USDT**: `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7` (6 decimals)
- **USDC**: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (6 decimals)
- **USDT.e**: `0xc7198437980c041c805A1EDcbA50c1Ce5db95118` (6 decimals)
- **USDC.e**: `0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664` (6 decimals)

### Testnet (Fuji - Chain ID: 43113)

- Update with actual testnet token addresses

## API Endpoints

### GET /

Service information and available endpoints

```bash
curl http://localhost:3402/
```

### GET /health

Health check

```bash
curl http://localhost:3402/health
```

### GET /list

List supported tokens and networks

```bash
curl http://localhost:3402/list
```

### POST /verify

Verify payment authorization signature

```bash
curl -X POST http://localhost:3402/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "token": "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      "payload": {
        "authorization": {
          "from": "0x...",
          "to": "0x...",
          "value": "10000000",
          "validAfter": 1234567890,
          "validBefore": 1234571490,
          "nonce": "0x..."
        },
        "signature": "0x..."
      }
    },
    "paymentRequirements": {
      "network": "avalanche",
      "relayerContract": "0x..."
    }
  }'
```

### POST /settle

Execute payment on-chain

```bash
curl -X POST http://localhost:3402/settle \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": { ... },
    "paymentRequirements": { ... }
  }'
```

### GET /metrics

Prometheus metrics endpoint

```bash
curl http://localhost:3402/metrics
```

## Payment Flow

1. **User signs payment authorization** (off-chain)

   - Creates EIP-712 signature with payment details
   - No gas needed for signing

2. **Client calls `/verify`**

   - Facilitator validates signature
   - Checks nonce hasn't been used
   - Verifies timing constraints

3. **Client calls `/settle`**
   - Facilitator submits transaction on-chain
   - Relayer wallet pays gas in AVAX
   - Tokens transferred from user to recipient

## EIP-712 Signature Format

### Domain

```javascript
{
  name: "A402",
  version: "1",
  chainId: 43114, // or 43113 for testnet
  verifyingContract: "0x..." // A402 relayer contract
}
```

### Type

```javascript
{
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ];
}
```

## Environment Variables

| Variable               | Required | Default              | Description                             |
| ---------------------- | -------- | -------------------- | --------------------------------------- |
| `NETWORK`              | No       | `testnet`            | Network to use (`mainnet` or `testnet`) |
| `RELAYER_PRIVATE_KEY`  | **Yes**  | -                    | Private key for relayer wallet          |
| `A402_RELAYER_ADDRESS` | **Yes**  | -                    | Deployed relayer contract address       |
| `AVAX_RPC_URL`         | No       | Avalanche public RPC | Custom mainnet RPC endpoint             |
| `AVAX_TESTNET_RPC_URL` | No       | Fuji public RPC      | Custom testnet RPC endpoint             |
| `SUPABASE_URL`         | No       | -                    | Supabase project URL for logging        |
| `SUPABASE_KEY`         | No       | -                    | Supabase anon key for logging           |
| `PORT`                 | No       | `3402`               | Server port                             |

## Security Features

- **Rate Limiting**: 100 requests per minute per IP
- **EIP-712 Signatures**: Cryptographically secure payment authorizations
- **Nonce Tracking**: Prevents replay attacks
- **Time Constraints**: Authorizations have validity windows
- **Token Caching**: Reduces RPC calls for better performance

## Monitoring

The facilitator includes Prometheus metrics:

- Request duration tracking
- Verify/settle request counters
- Gas usage metrics
- Transaction timing

Access metrics at: `http://localhost:3402/metrics`

## Deployment

### Railway

The service includes Railway configuration:

- `railway.json` - Railway settings
- `nixpacks.toml` - Build configuration

Deploy with:

```bash
railway up
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Manual

```bash
npm install
npm run build
npm start
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Migration from B402

See [AVALANCHE_MIGRATION.md](./AVALANCHE_MIGRATION.md) for detailed migration guide from BSC to Avalanche.

Key changes:

- Network: BSC → Avalanche C-Chain
- Chain IDs: 56/97 → 43114/43113
- Token addresses updated for Avalanche
- EIP-712 domain name: "B402" → "A402"

## Troubleshooting

### Relayer has insufficient AVAX

**Error**: Transaction fails with "insufficient funds"

**Solution**: Send AVAX to the relayer wallet address

- Mainnet: Buy AVAX and send to relayer
- Testnet: Get free AVAX from https://faucet.avax.network/

### RPC Connection Issues

**Error**: "Failed to connect to provider"

**Solution**: Check RPC endpoint is accessible

- Try default public RPCs
- Consider using paid RPC providers (Alchemy, Infura)
- Set custom RPC via `AVAX_RPC_URL` env var

### Invalid Signature

**Error**: "Invalid signature"

**Solution**: Ensure EIP-712 domain matches

- Domain name must be "A402"
- Chain ID must match network (43114/43113)
- Verifying contract must be correct relayer address

## Resources

- **Avalanche Docs**: https://docs.avax.network/
- **Snowtrace Explorer**: https://snowtrace.io/
- **Testnet Faucet**: https://faucet.avax.network/
- **EIP-712 Spec**: https://eips.ethereum.org/EIPS/eip-712

## License

MIT

## Support

For issues and questions:

- GitHub Issues: https://github.com/Vistara-Labs/b402/issues
- Documentation: See [AVALANCHE_MIGRATION.md](./AVALANCHE_MIGRATION.md)
