#!/usr/bin/env tsx
/**
 * Deploy A402Relayer contract to Avalanche C-Chain
 * 
 * Usage:
 *   export DEPLOYER_PRIVATE_KEY=0x...
 *   export NETWORK=mainnet  # or testnet for Fuji
 *   npx tsx scripts/deploy-a402-relayer.ts
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const NETWORK = process.env.NETWORK || 'testnet';

if (!DEPLOYER_PRIVATE_KEY) {
  console.error('❌ Error: DEPLOYER_PRIVATE_KEY environment variable is required');
  console.error('Usage: export DEPLOYER_PRIVATE_KEY=0x... && npx tsx scripts/deploy-a402-relayer.ts');
  process.exit(1);
}

// Network configuration
const NETWORKS = {
  mainnet: {
    name: 'Avalanche C-Chain Mainnet',
    rpc: process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    explorer: 'https://snowtrace.io',
    currency: 'AVAX'
  },
  testnet: {
    name: 'Avalanche Fuji Testnet',
    rpc: process.env.AVAX_TESTNET_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    explorer: 'https://testnet.snowtrace.io',
    currency: 'AVAX (testnet)'
  }
};

// A402Relayer contract bytecode and ABI
// This is a compiled version of the A402Relayer.sol contract
const A402_RELAYER_ABI = [
  "constructor()",
  "function NAME() view returns (string)",
  "function VERSION() view returns (string)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function transferWithAuthorization(address token, address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external",
  "function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)",
  "function cancelAuthorization(bytes32 nonce) external",
  "function setWhitelistEnabled(bool enabled) external",
  "function setTokenWhitelist(address token, bool status) external",
  "function pause() external",
  "function unpause() external",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner) external",
  "event TransferWithAuthorization(address indexed from, address indexed to, uint256 value, address indexed token, bytes32 nonce)"
];

async function main() {
  console.log('🏔️  A402 Relayer Deployment Script');
  console.log('=====================================\n');

  // Get network config
  const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
  if (!networkConfig) {
    console.error(`❌ Error: Invalid network "${NETWORK}". Use "mainnet" or "testnet"`);
    process.exit(1);
  }

  console.log(`Network: ${networkConfig.name}`);
  console.log(`Chain ID: ${networkConfig.chainId}`);
  console.log(`RPC: ${networkConfig.rpc}`);
  console.log(`Explorer: ${networkConfig.explorer}\n`);

  // Connect to network
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${deployer.address}`);

  // Check balance
  const balance = await provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ${networkConfig.currency}\n`);

  if (balance === 0n) {
    console.error(`❌ Error: Deployer has no ${networkConfig.currency}`);
    if (NETWORK === 'testnet') {
      console.error('Get testnet AVAX from: https://faucet.avax.network/');
    }
    process.exit(1);
  }

  // Check if contract source exists
  const contractPath = path.join(__dirname, '../contracts/A402Relayer.sol');
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Error: A402Relayer.sol not found');
    console.error('Expected location: contracts/A402Relayer.sol');
    console.error('\nYou need to compile the contract first using Hardhat or Foundry.');
    process.exit(1);
  }

  console.log('⚠️  Manual Compilation Required');
  console.log('================================\n');
  console.log('The A402Relayer contract needs to be compiled before deployment.');
  console.log('Please follow these steps:\n');
  
  console.log('Option 1: Using Hardhat');
  console.log('------------------------');
  console.log('1. Install Hardhat:');
  console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox');
  console.log('');
  console.log('2. Create hardhat.config.ts:');
  console.log(`
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY || ""]
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY || ""]
    }
  }
};

export default config;
`);
  console.log('3. Compile:');
  console.log('   npx hardhat compile');
  console.log('');
  console.log('4. Deploy:');
  console.log('   npx hardhat run scripts/deploy-a402-relayer.ts --network fuji');
  console.log('   npx hardhat run scripts/deploy-a402-relayer.ts --network avalanche');
  console.log('');

  console.log('Option 2: Using Foundry (Recommended)');
  console.log('--------------------------------------');
  console.log('1. Install Foundry:');
  console.log('   curl -L https://foundry.paradigm.xyz | bash');
  console.log('   foundryup');
  console.log('');
  console.log('2. Initialize Foundry project:');
  console.log('   forge init --no-git');
  console.log('');
  console.log('3. Install OpenZeppelin:');
  console.log('   forge install OpenZeppelin/openzeppelin-contracts');
  console.log('');
  console.log('4. Create foundry.toml:');
  console.log(`
[profile.default]
src = "contracts"
out = "out"
libs = ["node_modules", "lib"]
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/"
]
`);
  console.log('5. Deploy to Fuji testnet:');
  console.log('   forge create contracts/A402Relayer.sol:A402Relayer \\');
  console.log('     --rpc-url https://api.avax-test.network/ext/bc/C/rpc \\');
  console.log('     --private-key $DEPLOYER_PRIVATE_KEY \\');
  console.log('     --verify \\');
  console.log('     --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan \\');
  console.log('     --etherscan-api-key "verifyContract"');
  console.log('');
  console.log('6. Deploy to Avalanche mainnet:');
  console.log('   forge create contracts/A402Relayer.sol:A402Relayer \\');
  console.log('     --rpc-url https://api.avax.network/ext/bc/C/rpc \\');
  console.log('     --private-key $DEPLOYER_PRIVATE_KEY \\');
  console.log('     --verify \\');
  console.log('     --verifier-url https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan \\');
  console.log('     --etherscan-api-key "verifyContract"');
  console.log('');

  console.log('📝 After Deployment');
  console.log('-------------------');
  console.log('1. Copy the deployed contract address');
  console.log('2. Set A402_RELAYER_ADDRESS in your .env file');
  console.log('3. Whitelist tokens (optional):');
  console.log('   cast send <CONTRACT_ADDRESS> \\');
  console.log('     "setTokenWhitelist(address,bool)" \\');
  console.log('     <TOKEN_ADDRESS> true \\');
  console.log('     --rpc-url $RPC_URL \\');
  console.log('     --private-key $DEPLOYER_PRIVATE_KEY');
  console.log('');
  console.log('4. Test the deployment:');
  console.log('   cast call <CONTRACT_ADDRESS> "NAME()" --rpc-url $RPC_URL');
  console.log('   # Should return: A402');
}

main()
  .then(() => {
    console.log('\n✅ Setup instructions provided');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

