#!/usr/bin/env ts-node
/**
 * Deploy TestToken for A402 Testing
 * 
 * Deploys a simple ERC20 token that you can use to test A402 gasless payments.
 * Includes faucet function so anyone can claim tokens for testing.
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const NETWORK = process.env.NETWORK || 'testnet';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY;

// RPC URLs
const RPC_URLS = {
  mainnet: 'https://api.avax.network/ext/bc/C/rpc',
  testnet: 'https://api.avax-test.network/ext/bc/C/rpc',
};

// Token configuration (customize these!)
const TOKEN_CONFIG = {
  name: 'Test USD Token',
  symbol: 'TUSDT',
  decimals: 6, // Use 6 for USDT-like tokens, 18 for standard ERC20
  initialSupply: 1000000, // Initial supply in whole tokens (1 million)
};

// TestToken contract ABI (just what we need for deployment)
const TEST_TOKEN_ABI = [
  'constructor(string memory name, string memory symbol, uint8 decimals_, uint256 initialSupply)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function mint(address to, uint256 amount) external',
  'function faucet(uint256 amount) external',
];

// Compile the contract bytecode (you'll need to compile TestToken.sol first)
const TEST_TOKEN_BYTECODE = ''; // We'll get this from compilation

async function deployTestToken() {
  console.log('🪙 Deploying TestToken for A402 Testing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('❌ Error: DEPLOYER_PRIVATE_KEY or RELAYER_PRIVATE_KEY not set in .env');
    console.log('\nSet one of these in your .env file:');
    console.log('  DEPLOYER_PRIVATE_KEY=0x...');
    console.log('  RELAYER_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  // Setup provider and wallet
  const rpcUrl = RPC_URLS[NETWORK as keyof typeof RPC_URLS];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log('📋 Configuration:');
  console.log('  Network:', NETWORK);
  console.log('  RPC:', rpcUrl);
  console.log('  Deployer:', wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('  Balance:', ethers.formatEther(balance), 'AVAX');

  if (balance === 0n) {
    console.error('\n❌ Error: Deployer has no AVAX for gas fees');
    console.log('\nGet testnet AVAX from: https://faucet.avax.network/');
    process.exit(1);
  }

  console.log('\n🪙 Token Configuration:');
  console.log('  Name:', TOKEN_CONFIG.name);
  console.log('  Symbol:', TOKEN_CONFIG.symbol);
  console.log('  Decimals:', TOKEN_CONFIG.decimals);
  console.log('  Initial Supply:', TOKEN_CONFIG.initialSupply.toLocaleString(), 'tokens');

  console.log('\n⏳ Deploying contract...\n');

  try {
    // Note: You need to compile the contract first with Foundry
    console.log('Please compile the contract first:');
    console.log('  forge build\n');
    
    // Then use forge create instead:
    const chainId = NETWORK === 'mainnet' ? 43114 : 43113;
    
    console.log('Run this command to deploy:\n');
    console.log(`forge create contracts/TestToken.sol:TestToken \\`);
    console.log(`  --rpc-url ${rpcUrl} \\`);
    console.log(`  --private-key $DEPLOYER_PRIVATE_KEY \\`);
    console.log(`  --constructor-args \\`);
    console.log(`    "${TOKEN_CONFIG.name}" \\`);
    console.log(`    "${TOKEN_CONFIG.symbol}" \\`);
    console.log(`    ${TOKEN_CONFIG.decimals} \\`);
    console.log(`    ${TOKEN_CONFIG.initialSupply}\n`);
    
    console.log('After deployment:');
    console.log('  1. Save the contract address');
    console.log('  2. Mint tokens to your test wallet');
    console.log('  3. Approve A402Relayer to spend tokens');
    console.log('  4. Test gasless payments!\n');

  } catch (error: any) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployTestToken().catch(console.error);

