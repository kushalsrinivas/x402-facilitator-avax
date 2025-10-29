#!/bin/bash
# Complete script to deploy test token and set up for A402 testing

set -e

echo "🪙 TestToken Deployment & Setup for A402"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Foundry installation
if ! command -v forge &> /dev/null; then
  echo "❌ Error: Foundry not installed"
  echo ""
  echo "Install Foundry with:"
  echo "  curl -L https://foundry.paradigm.xyz | bash"
  echo "  foundryup"
  echo ""
  exit 1
fi

if ! command -v cast &> /dev/null; then
  echo "❌ Error: cast (Foundry) not found"
  echo ""
  echo "Run: foundryup"
  echo ""
  exit 1
fi

echo "✓ Foundry installed"
echo ""

# Load environment variables
if [ ! -f b402-facilitator/.env ]; then
  echo "❌ Error: b402-facilitator/.env not found"
  echo ""
  echo "Create it first:"
  echo "  cd b402-facilitator"
  echo "  cp .envr.example .env"
  echo "  # Edit .env with your RELAYER_PRIVATE_KEY and A402_RELAYER_ADDRESS"
  echo ""
  exit 1
fi

source b402-facilitator/.env

# Check required variables
if [ -z "$RELAYER_PRIVATE_KEY" ]; then
  echo "❌ Error: RELAYER_PRIVATE_KEY not set in .env"
  exit 1
fi

if [ -z "$A402_RELAYER_ADDRESS" ]; then
  echo "❌ Error: A402_RELAYER_ADDRESS not set in .env"
  exit 1
fi

NETWORK=${NETWORK:-testnet}
if [ "$NETWORK" == "mainnet" ]; then
  RPC_URL="https://api.avax.network/ext/bc/C/rpc"
  CHAIN_ID=43114
else
  RPC_URL="https://api.avax-test.network/ext/bc/C/rpc"
  CHAIN_ID=43113
fi

# Get deployer address
echo "⏳ Getting deployer address..."
DEPLOYER_ADDRESS=$(cast wallet address $RELAYER_PRIVATE_KEY 2>&1)
if [ $? -ne 0 ]; then
  echo "❌ Error: Invalid RELAYER_PRIVATE_KEY"
  exit 1
fi

echo "📋 Configuration:"
echo "  Network: $NETWORK"
echo "  Chain ID: $CHAIN_ID"
echo "  Deployer: $DEPLOYER_ADDRESS"
echo "  A402 Relayer: $A402_RELAYER_ADDRESS"
echo ""

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
BALANCE_AVAX=$(cast --to-unit $BALANCE ether)
echo "💰 Deployer Balance: $BALANCE_AVAX AVAX"

if [ "$BALANCE" == "0" ]; then
  echo ""
  echo "❌ Error: Deployer has no AVAX for gas fees"
  echo "Get testnet AVAX from: https://faucet.avax.network/"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Compile Contracts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
forge build

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Deploy TestToken"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Token Configuration:"
echo "  Name: Test USD Token"
echo "  Symbol: TUSDT"
echo "  Decimals: 6"
echo "  Initial Supply: 1,000,000 TUSDT"
echo ""
echo "⏳ Deploying..."

# Deploy TestToken
DEPLOY_OUTPUT=$(forge create contracts/TestToken.sol:TestToken \
  --rpc-url $RPC_URL \
  --private-key $RELAYER_PRIVATE_KEY \
  --constructor-args "Test USD Token" "TUSDT" 6 1000000 \
  2>&1)

# Extract contract address
TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$TOKEN_ADDRESS" ]; then
  echo "❌ Deployment failed"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

echo "✅ TestToken deployed to: $TOKEN_ADDRESS"
echo ""

# Wait for deployment to be confirmed
echo "⏳ Waiting for deployment confirmation..."
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Verify Token Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check token details
TOKEN_NAME=$(cast call $TOKEN_ADDRESS "name()(string)" --rpc-url $RPC_URL)
TOKEN_SYMBOL=$(cast call $TOKEN_ADDRESS "symbol()(string)" --rpc-url $RPC_URL)
TOKEN_DECIMALS=$(cast call $TOKEN_ADDRESS "decimals()(uint8)" --rpc-url $RPC_URL)
TOKEN_SUPPLY=$(cast call $TOKEN_ADDRESS "totalSupply()(uint256)" --rpc-url $RPC_URL)
TOKEN_SUPPLY_FORMATTED=$(cast --from-wei $(cast --to-dec $TOKEN_SUPPLY) mwei) # 6 decimals = mwei

echo "Token Details:"
echo "  Address: $TOKEN_ADDRESS"
echo "  Name: $TOKEN_NAME"
echo "  Symbol: $TOKEN_SYMBOL"
echo "  Decimals: $TOKEN_DECIMALS"
echo "  Total Supply: $TOKEN_SUPPLY_FORMATTED TUSDT"
echo ""

# Check deployer balance
DEPLOYER_BALANCE=$(cast call $TOKEN_ADDRESS "balanceOf(address)(uint256)" $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
DEPLOYER_BALANCE_FORMATTED=$(cast --from-wei $(cast --to-dec $DEPLOYER_BALANCE) mwei)
echo "  Your Balance: $DEPLOYER_BALANCE_FORMATTED TUSDT"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Approve A402Relayer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Approving A402Relayer to spend your tokens..."
echo "This allows gasless payments through A402"
echo ""

# Approve relayer (max amount)
cast send $TOKEN_ADDRESS \
  "approve(address,uint256)" \
  $A402_RELAYER_ADDRESS \
  999999999999999999 \
  --rpc-url $RPC_URL \
  --private-key $RELAYER_PRIVATE_KEY \
  --quiet

echo "✅ Approval successful!"
echo ""

# Verify allowance
ALLOWANCE=$(cast call $TOKEN_ADDRESS "allowance(address,address)(uint256)" $DEPLOYER_ADDRESS $A402_RELAYER_ADDRESS --rpc-url $RPC_URL)
ALLOWANCE_FORMATTED=$(cast --from-wei $(cast --to-dec $ALLOWANCE) mwei)
echo "  Allowance: $ALLOWANCE_FORMATTED TUSDT"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Save these details:"
echo ""
echo "export TEST_TOKEN_ADDRESS=$TOKEN_ADDRESS"
echo "export TEST_USER_ADDRESS=$DEPLOYER_ADDRESS"
echo ""
echo "🔗 View on Snowtrace:"
if [ "$NETWORK" == "mainnet" ]; then
  echo "  https://snowtrace.io/address/$TOKEN_ADDRESS"
else
  echo "  https://testnet.snowtrace.io/address/$TOKEN_ADDRESS"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start the facilitator:"
echo "   cd b402-facilitator && npm run dev"
echo ""
echo "2. Test gasless payment with your token:"
echo "   TEST_TOKEN_ADDRESS=$TOKEN_ADDRESS \\"
echo "   TEST_USER_PRIVATE_KEY=$RELAYER_PRIVATE_KEY \\"
echo "   ts-node test-send-test-token.ts"
echo ""
echo "3. Or send to your recipient address:"
echo "   # Send 0.1 TUSDT to 0x243E0B615BfEa0f315109b8b415e3D6b9c3131F7"
echo "   TEST_TOKEN_ADDRESS=$TOKEN_ADDRESS \\"
echo "   TEST_USER_PRIVATE_KEY=$RELAYER_PRIVATE_KEY \\"
echo "   ts-node test-send-test-token.ts \\"
echo "     0x243E0B615BfEa0f315109b8b415e3D6b9c3131F7 \\"
echo "     0.1"
echo ""
echo "🎉 Ready to test A402 gasless payments!"

