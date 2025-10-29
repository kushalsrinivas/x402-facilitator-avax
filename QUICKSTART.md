# A402 Quick Start Guide

Get the A402 facilitator running on Avalanche in 15 minutes.

## What You Need

1. **Deploy the A402Relayer contract** (smart contract on Avalanche)
2. **Run the facilitator service** (backend server)
3. **Connect your application** (frontend/SDK)

---

## Step 1: Deploy A402Relayer Contract (5-10 minutes)

### Option A: Quick Deploy with Foundry (Recommended)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-git

# Set your deployer private key
export DEPLOYER_PRIVATE_KEY=0x...

# Get testnet AVAX (if testing)
# Visit: https://faucet.avax.network/

# Deploy to Fuji testnet
forge create contracts/A402Relayer.sol:A402Relayer \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY

# Save the "Deployed to" address - this is your A402_RELAYER_ADDRESS
```

### Option B: Use Hardhat

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed Hardhat instructions.

---

## Step 2: Configure Facilitator Service (2 minutes)

```bash
cd b402-facilitator

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
# Network
NETWORK=testnet

# Contract (from Step 1)
A402_RELAYER_ADDRESS=0xYourDeployedContractAddress

# Relayer wallet (needs AVAX for gas)
RELAYER_PRIVATE_KEY=0xYourRelayerPrivateKey

# Server
PORT=3402
EOF

# Start the service
npm run dev
```

Visit http://localhost:3402 to confirm it's running.

---

## Step 3: Test the Setup (3 minutes)

### Create a test payment authorization:

```typescript
import { ethers } from "ethers";

// Setup
const userWallet = new ethers.Wallet("0x...");
const relayerAddress = "0x..."; // From Step 1
const chainId = 43113; // Fuji testnet

// Create authorization
const domain = {
  name: "A402",
  version: "1",
  chainId: chainId,
  verifyingContract: relayerAddress,
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
  from: userWallet.address,
  to: "0xRecipientAddress",
  value: ethers.parseUnits("10", 6), // 10 USDT (6 decimals)
  validAfter: Math.floor(Date.now() / 1000),
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: ethers.hexlify(ethers.randomBytes(32)),
};

// Sign
const signature = await userWallet.signTypedData(domain, types, authorization);

// Verify with facilitator
const response = await fetch("http://localhost:3402/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    paymentPayload: {
      token: "0xUSDT_ADDRESS",
      payload: { authorization, signature },
    },
    paymentRequirements: {
      network: "avalanche",
      relayerContract: relayerAddress,
    },
  }),
});

const result = await response.json();
console.log("Verification:", result);
```

---

## Step 4: Go Live on Mainnet

### Deploy to Mainnet:

```bash
# Deploy contract to Avalanche mainnet
forge create contracts/A402Relayer.sol:A402Relayer \
  --rpc-url https://api.avax.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY

# Update .env
NETWORK=mainnet
A402_RELAYER_ADDRESS=0xYourMainnetContractAddress

# Restart facilitator
npm run build
npm start
```

### Mainnet Token Addresses:

```bash
USDT=0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7
USDC=0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E
```

---

## Common Commands

```bash
# Check facilitator status
curl http://localhost:3402/health

# List supported tokens
curl http://localhost:3402/list

# View metrics
curl http://localhost:3402/metrics

# Check contract on chain
cast call $A402_RELAYER_ADDRESS "NAME()" --rpc-url $RPC_URL
# Returns: A402
```

---

## Troubleshooting

### "Insufficient funds" error

- **Testnet**: Get AVAX from https://faucet.avax.network/
- **Mainnet**: Send AVAX to your relayer wallet

### "Invalid signature" error

- Ensure domain name is "A402"
- Check chain ID matches network (43114 mainnet, 43113 testnet)
- Verify relayer contract address is correct

### "Token transfer failed" error

- User must approve relayer contract to spend tokens
- Check user has sufficient token balance

---

## Architecture Overview

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    User     │  Signs  │   Facilitator    │  Sends  │   A402Relayer   │
│   Wallet    │────────▶│     Service      │────────▶│    Contract     │
│             │         │  (Node.js API)   │         │  (Solidity)     │
└─────────────┘         └──────────────────┘         └──────────────────┘
      │                         │                             │
      │ No gas needed          │ Pays gas in AVAX           │
      │ Just signs             │ Verifies signature          │ Executes transfer
      │                         │ Submits transaction         │ Transfers tokens
      └─────────────────────────┴─────────────────────────────┘
```

---

## What's Next?

1. **Read Full Documentation**:

   - [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment steps
   - [b402-facilitator/README.md](./b402-facilitator/README.md) - Facilitator API docs
   - [AVALANCHE_MIGRATION.md](./b402-facilitator/AVALANCHE_MIGRATION.md) - Migration details

2. **Integrate with Your App**:

   - Use the SDK (see `b402-sdk/`)
   - Or call the facilitator API directly

3. **Monitor Your Service**:

   - Set up Prometheus for metrics
   - Monitor relayer wallet AVAX balance
   - Track transaction success rates

4. **Security Checklist**:
   - [ ] Contract verified on Snowtrace
   - [ ] Relayer wallet has sufficient AVAX
   - [ ] Environment variables secured
   - [ ] Rate limiting configured
   - [ ] Monitoring and alerts set up

---

## Resources

- **Avalanche Docs**: https://docs.avax.network/
- **Snowtrace (Explorer)**: https://snowtrace.io/
- **Testnet Faucet**: https://faucet.avax.network/
- **Foundry**: https://book.getfoundry.sh/

---

## Support

- GitHub Issues: https://github.com/Vistara-Labs/b402/issues
- Avalanche Discord: https://discord.gg/RwXY7P6

---

**Ready to build gasless payments on Avalanche? Let's go! 🏔️❄️**
