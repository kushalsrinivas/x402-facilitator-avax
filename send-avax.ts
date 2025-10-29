#!/usr/bin/env ts-node
/**
 * Simple AVAX Transfer Script
 * Sends native AVAX from one address to another
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const FROM_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.TEST_USER_PRIVATE_KEY!;
const TO_ADDRESS = '0x243E0B615BfEa0f315109b8b415e3D6b9c3131F7';
const AMOUNT_AVAX = '0.1'; // 0.1 AVAX
const NETWORK = process.env.NETWORK || 'testnet';

// RPC URLs
const RPC_URLS = {
  mainnet: 'https://api.avax.network/ext/bc/C/rpc',
  testnet: 'https://api.avax-test.network/ext/bc/C/rpc',
};

async function main() {
  console.log('💸 Sending AVAX on Avalanche C-Chain');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!FROM_PRIVATE_KEY) {
    throw new Error('Private key not set. Set RELAYER_PRIVATE_KEY or TEST_USER_PRIVATE_KEY in .env');
  }

  // Setup
  const rpcUrl = RPC_URLS[NETWORK as keyof typeof RPC_URLS];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(FROM_PRIVATE_KEY, provider);

  console.log('Network:', NETWORK);
  console.log('RPC:', rpcUrl);
  console.log('From:', wallet.address);
  console.log('To:', TO_ADDRESS);
  console.log('Amount:', AMOUNT_AVAX, 'AVAX');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceFormatted = ethers.formatEther(balance);
  console.log('Current Balance:', balanceFormatted, 'AVAX');

  const amountWei = ethers.parseEther(AMOUNT_AVAX);
  
  if (balance < amountWei) {
    console.error('❌ Insufficient balance!');
    console.log(`   Need: ${AMOUNT_AVAX} AVAX`);
    console.log(`   Have: ${balanceFormatted} AVAX`);
    
    if (NETWORK === 'testnet') {
      console.log('\n💡 Get testnet AVAX from: https://faucet.avax.network/');
    }
    process.exit(1);
  }

  // Estimate gas
  const gasEstimate = await provider.estimateGas({
    from: wallet.address,
    to: TO_ADDRESS,
    value: amountWei,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('25', 'gwei');
  const estimatedCost = gasEstimate * gasPrice;
  
  console.log('\nTransaction Details:');
  console.log('  Gas Estimate:', gasEstimate.toString());
  console.log('  Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'nAVAX');
  console.log('  Estimated Fee:', ethers.formatEther(estimatedCost), 'AVAX');
  console.log('  Total Cost:', ethers.formatEther(amountWei + estimatedCost), 'AVAX');

  // Send transaction
  console.log('\n⏳ Sending transaction...');
  const tx = await wallet.sendTransaction({
    to: TO_ADDRESS,
    value: amountWei,
  });

  console.log('✅ Transaction sent!');
  console.log('   Hash:', tx.hash);
  
  const explorerUrl = NETWORK === 'mainnet'
    ? `https://snowtrace.io/tx/${tx.hash}`
    : `https://testnet.snowtrace.io/tx/${tx.hash}`;
  console.log('   Explorer:', explorerUrl);

  // Wait for confirmation
  console.log('\n⏳ Waiting for confirmation...');
  const receipt = await tx.wait();

  if (receipt?.status === 1) {
    console.log('✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas Used:', receipt.gasUsed.toString());
    console.log('   Effective Gas Price:', ethers.formatUnits(receipt.gasPrice || 0n, 'gwei'), 'nAVAX');
    
    const actualCost = receipt.gasUsed * (receipt.gasPrice || 0n);
    console.log('   Actual Fee:', ethers.formatEther(actualCost), 'AVAX');

    // Check new balance
    const newBalance = await provider.getBalance(wallet.address);
    console.log('\nNew Balance:', ethers.formatEther(newBalance), 'AVAX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Transfer complete!');
  } else {
    console.error('❌ Transaction failed!');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

