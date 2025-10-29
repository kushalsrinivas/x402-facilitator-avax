# A402 - Gasless Payment Facilitator for Avalanche C-Chain

**A402** enables gasless token transfers on Avalanche C-Chain. Users can send USDT, USDC, and other ERC20 tokens without holding AVAX for gas fees.

## Features

- ✅ **Gasless transfers** - Users sign transactions, facilitator pays gas
- ✅ **EIP-712 signatures** - Secure off-chain authorization
- ✅ **Multi-token support** - USDT, USDC, and any ERC20 token
- ✅ **Replay protection** - Nonce-based security
- ✅ **Production ready** - Rate limiting, monitoring, logging

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                   A402 Payment Flow                          │
└──────────────────────────────────────────────────────────────┘

1. User approves relayer contract to spend tokens
   ↓
2. User signs EIP-712 payment authorization (off-chain, no gas)
   ↓
3. Client sends authorization to facilitator /verify endpoint
   ↓
4. Facilitator validates signature, nonce, timing
   ↓
5. Client sends to facilitator /settle endpoint
   ↓
6. Facilitator submits transaction to blockchain (pays gas in AVAX)
   ↓
7. A402Relayer contract executes token transfer
   ↓
8. Tokens transferred from user to recipient ✅
```

## Quick Start

### Prerequisites

- AVAX for gas (testnet: [faucet](https://faucet.avax.network/), mainnet: buy AVAX)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) or Hardhat installed
- Node.js 18+

### 1. Deploy Smart Contract

```bash
# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-git

# Compile contracts
forge build

# Deploy to Fuji testnet
forge create b402-facilitator/contracts/A402Relayer.sol:A402Relayer \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY

# Save the deployed address
```

### 2. Configure Facilitator Service

```bash
cd b402-facilitator

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NETWORK=testnet
A402_RELAYER_ADDRESS=0xYourDeployedContractAddress
RELAYER_PRIVATE_KEY=0xYourRelayerPrivateKey
PORT=3402
EOF

# Start the service
npm run dev
```

### 3. Test the Setup

```bash
# Deploy test token
bash deploy-and-test-token.sh

# Start facilitator (in another terminal)
cd b402-facilitator && npm run dev

# Send gasless payment
TEST_TOKEN_ADDRESS=0xYourTokenAddress \
ts-node test-send-test-token.ts \
  0xRecipientAddress \
  0.1
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed instructions.

## Repository Structure

```
b402/
├── b402-facilitator/         # Facilitator API service
│   ├── contracts/            # Smart contracts
│   │   └── A402Relayer.sol   # Main relayer contract
│   ├── scripts/              # Deployment scripts
│   ├── src/
│   │   └── server.ts         # Express API server
│   └── package.json
├── contracts/
│   └── TestToken.sol         # Test ERC20 token
├── scripts/
│   └── deploy-test-token.ts  # Test token deployment
├── foundry.toml              # Foundry configuration
├── QUICKSTART.md             # Getting started guide
└── README.md                 # This file
```

## Network Information

### Avalanche C-Chain Mainnet
- **Chain ID**: 43114
- **RPC**: https://api.avax.network/ext/bc/C/rpc
- **Explorer**: https://snowtrace.io/

### Avalanche Fuji Testnet
- **Chain ID**: 43113
- **RPC**: https://api.avax-test.network/ext/bc/C/rpc
- **Explorer**: https://testnet.snowtrace.io/
- **Faucet**: https://faucet.avax.network/

## Supported Tokens (Mainnet)

| Token  | Address                                      | Decimals |
| ------ | -------------------------------------------- | -------- |
| USDT   | `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7` | 6        |
| USDC   | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | 6        |
| USDT.e | `0xc7198437980c041c805A1EDcbA50c1Ce5db95118` | 6        |
| USDC.e | `0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664` | 6        |

## API Endpoints

The facilitator service provides:

- `GET /` - Service information
- `GET /health` - Health check
- `GET /list` - List supported tokens
- `POST /verify` - Verify payment authorization
- `POST /settle` - Execute payment on-chain
- `GET /metrics` - Prometheus metrics

See [b402-facilitator/README.md](./b402-facilitator/README.md) for API documentation.

## Security Features

### Smart Contract
- EIP-712 signature verification
- Nonce-based replay protection
- Time-bound authorizations (validAfter/validBefore)
- Token whitelist support (optional)
- Emergency pause functionality
- Reentrancy protection

### Facilitator Service
- Rate limiting (100 req/min per IP)
- Signature validation before submission
- Nonce checking (prevents double-spend)
- Timing verification
- Audit logging (optional)
- Prometheus metrics

## Development

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts
forge build

# Run tests
forge test

# Deploy to testnet
forge create contracts/A402Relayer.sol:A402Relayer \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT

## Support

- **GitHub Issues**: https://github.com/Vistara-Labs/b402/issues
- **Documentation**: See [QUICKSTART.md](./QUICKSTART.md)
- **Avalanche Discord**: https://discord.gg/RwXY7P6

## Acknowledgments

Built with:
- [OpenZeppelin](https://openzeppelin.com/) - Smart contract libraries
- [Foundry](https://book.getfoundry.sh/) - Solidity development toolchain
- [Express](https://expressjs.com/) - Web framework
- [ethers.js](https://docs.ethers.org/) - Ethereum library

---

**Ready to build gasless payments on Avalanche! 🏔️❄️**

