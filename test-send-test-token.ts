#!/usr/bin/env ts-node
/**
 * Test A402 with your own deployed TestToken
 * Sends tokens gaslessly using A402
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Configuration from environment
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3402';
const USER_PRIVATE_KEY = process.env.TEST_USER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY;
const A402_RELAYER_ADDRESS = process.env.A402_RELAYER_ADDRESS!;
const NETWORK = process.env.NETWORK || 'testnet';
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS;

// From command line or defaults
const RECIPIENT = process.argv[2] || '0x243E0B615BfEa0f315109b8b415e3D6b9c3131F7';
const AMOUNT = process.argv[3] || '0.1';

// RPC URLs
const RPC_URLS = {
  mainnet: 'https://api.avax.network/ext/bc/C/rpc',
  testnet: 'https://api.avax-test.network/ext/bc/C/rpc',
};

const CHAIN_IDS = {
  mainnet: 43114,
  testnet: 43113,
};

async function main() {
  console.log('🧪 A402 TestToken Gasless Payment Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate inputs
  if (!USER_PRIVATE_KEY) {
    console.error('❌ Error: TEST_USER_PRIVATE_KEY or RELAYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  if (!A402_RELAYER_ADDRESS) {
    console.error('❌ Error: A402_RELAYER_ADDRESS not set in .env');
    process.exit(1);
  }

  if (!TEST_TOKEN_ADDRESS) {
    console.error('❌ Error: TEST_TOKEN_ADDRESS not set');
    console.log('\nRun the deployment script first:');
    console.log('  bash deploy-and-test-token.sh\n');
    process.exit(1);
  }

  if (!ethers.isAddress(RECIPIENT)) {
    console.error('❌ Error: Invalid recipient address');
    console.log('Usage: ts-node test-send-test-token.ts <recipient> <amount>');
    process.exit(1);
  }

  // Setup
  const wallet = new ethers.Wallet(USER_PRIVATE_KEY);
  const chainId = CHAIN_IDS[NETWORK as keyof typeof CHAIN_IDS];
  const rpcUrl = RPC_URLS[NETWORK as keyof typeof RPC_URLS];
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  console.log('📋 Configuration:');
  console.log('  Network:', NETWORK);
  console.log('  Chain ID:', chainId);
  console.log('  Token:', TEST_TOKEN_ADDRESS);
  console.log('  From:', wallet.address);
  console.log('  To:', RECIPIENT);
  console.log('  Amount:', AMOUNT, 'TUSDT');
  console.log('  Facilitator:', FACILITATOR_URL);
  console.log('  Relayer:', A402_RELAYER_ADDRESS);
  console.log('');

  // Get token info
  const tokenAbi = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
  ];
  const token = new ethers.Contract(TEST_TOKEN_ADDRESS, tokenAbi, provider);

  try {
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const balance = await token.balanceOf(wallet.address);
    const allowance = await token.allowance(wallet.address, A402_RELAYER_ADDRESS);

    console.log('💰 Token Info:');
    console.log('  Symbol:', symbol);
    console.log('  Decimals:', decimals);
    console.log('  Your Balance:', ethers.formatUnits(balance, decimals), symbol);
    console.log('  Allowance:', ethers.formatUnits(allowance, decimals), symbol);
    console.log('');

    // Check if user has enough tokens
    const amountWei = ethers.parseUnits(AMOUNT, decimals);
    if (balance < amountWei) {
      console.error(`❌ Error: Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} but trying to send ${AMOUNT}`);
      console.log('\nMint more tokens with:');
      console.log(`  cast send ${TEST_TOKEN_ADDRESS} "mint(address,uint256)" ${wallet.address} 1000 --rpc-url ${rpcUrl} --private-key <owner-key>`);
      process.exit(1);
    }

    // Check if allowance is sufficient
    if (allowance < amountWei) {
      console.error('❌ Error: Insufficient allowance');
      console.log('\nApprove A402Relayer with:');
      console.log(`  cast send ${TEST_TOKEN_ADDRESS} "approve(address,uint256)" ${A402_RELAYER_ADDRESS} 999999999999 --rpc-url ${rpcUrl} --private-key ${USER_PRIVATE_KEY}`);
      process.exit(1);
    }

    // Create authorization
    const now = Math.floor(Date.now() / 1000);
    const authorization = {
      from: wallet.address,
      to: RECIPIENT,
      value: amountWei.toString(),
      validAfter: now - 60,
      validBefore: now + 3600,
      nonce: ethers.hexlify(ethers.randomBytes(32)),
    };

    console.log('🔏 Creating EIP-712 Signature...');

    // Sign with EIP-712
    const domain = {
      name: 'A402',
      version: '1',
      chainId: chainId,
      verifyingContract: A402_RELAYER_ADDRESS,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const signature = await wallet.signTypedData(domain, types, authorization);
    console.log('  ✓ Signature created');
    console.log('');

    // Prepare payload
    const payload = {
      paymentPayload: {
        token: TEST_TOKEN_ADDRESS,
        payload: {
          authorization,
          signature,
        },
      },
      paymentRequirements: {
        network: 'avalanche',
        relayerContract: A402_RELAYER_ADDRESS,
      },
    };

    // Step 1: Verify
    console.log('📝 Step 1: Verifying signature with facilitator...');
    const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.isValid) {
      console.error('❌ Verification failed:', verifyResult.invalidReason);
      process.exit(1);
    }

    console.log('  ✅ Signature verified!');
    console.log('');

    // Step 2: Settle
    console.log('💸 Step 2: Settling payment on-chain...');
    console.log('  ⏳ This may take a few seconds...');
    console.log('');

    const settleResponse = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const settleResult = await settleResponse.json();

    if (!settleResult.success) {
      console.error('❌ Settlement failed:', settleResult.errorReason);
      process.exit(1);
    }

    console.log('  ✅ Payment successful!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Transaction Details');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  From:', wallet.address);
    console.log('  To:', RECIPIENT);
    console.log('  Amount:', AMOUNT, symbol);
    console.log('  Token:', TEST_TOKEN_ADDRESS);
    console.log('  TX Hash:', settleResult.transaction);
    console.log('  Block:', settleResult.blockNumber);
    console.log('');

    const explorerUrl = NETWORK === 'mainnet'
      ? `https://snowtrace.io/tx/${settleResult.transaction}`
      : `https://testnet.snowtrace.io/tx/${settleResult.transaction}`;

    console.log('🔗 View on Snowtrace:');
    console.log('  ', explorerUrl);
    console.log('');

    console.log('✅ GASLESS PAYMENT COMPLETE! 🎉');
    console.log('   The recipient received tokens without needing AVAX for gas!');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

