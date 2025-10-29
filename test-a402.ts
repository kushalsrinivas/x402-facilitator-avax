#!/usr/bin/env ts-node
/**
 * A402 End-to-End Test Script
 * 
 * This script tests the complete A402 gasless payment flow:
 * 1. Creates a payment authorization
 * 2. Signs it with EIP-712
 * 3. Verifies with the facilitator
 * 4. Settles the payment on-chain
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3402';
const USER_PRIVATE_KEY = process.env.TEST_USER_PRIVATE_KEY!;
const A402_RELAYER_ADDRESS = process.env.A402_RELAYER_ADDRESS!;
const NETWORK = process.env.NETWORK || 'testnet';

// Token addresses (Avalanche C-Chain)
const TOKENS = {
  mainnet: {
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
  testnet: {
    // Update with actual testnet addresses
    USDT: '0x9e9ab4D5e5e7D7E7E5e5E5E5E5E5E5E5E5E5E5E5',
  },
};

// Chain IDs
const CHAIN_IDS = {
  mainnet: 43114,
  testnet: 43113,
};

// RPC URLs
const RPC_URLS = {
  mainnet: 'https://api.avax.network/ext/bc/C/rpc',
  testnet: 'https://api.avax-test.network/ext/bc/C/rpc',
};

interface Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

class A402Tester {
  private wallet: ethers.Wallet;
  private chainId: number;
  private tokenAddress: string;
  private results: TestResult[] = [];

  constructor() {
    if (!USER_PRIVATE_KEY) {
      throw new Error('TEST_USER_PRIVATE_KEY not set in .env');
    }
    if (!A402_RELAYER_ADDRESS) {
      throw new Error('A402_RELAYER_ADDRESS not set in .env');
    }

    this.wallet = new ethers.Wallet(USER_PRIVATE_KEY);
    this.chainId = CHAIN_IDS[NETWORK as keyof typeof CHAIN_IDS];
    this.tokenAddress = TOKENS[NETWORK as keyof typeof TOKENS].USDT;

    console.log('🧪 A402 Test Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Network:', NETWORK);
    console.log('Chain ID:', this.chainId);
    console.log('Facilitator:', FACILITATOR_URL);
    console.log('User Address:', this.wallet.address);
    console.log('Relayer Contract:', A402_RELAYER_ADDRESS);
    console.log('Test Token:', this.tokenAddress);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  private logResult(result: TestResult) {
    this.results.push(result);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.step}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data) {
      console.log('   Data:', JSON.stringify(result.data, null, 2));
    }
    console.log('');
  }

  async testFacilitatorHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${FACILITATOR_URL}/health`);
      const data = await response.json();

      this.logResult({
        step: 'Check Facilitator Health',
        success: response.ok && data.status === 'healthy',
        data,
        timestamp: Date.now(),
      });

      return response.ok;
    } catch (error: any) {
      this.logResult({
        step: 'Check Facilitator Health',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  async testListTokens(): Promise<boolean> {
    try {
      const response = await fetch(`${FACILITATOR_URL}/list`);
      const data = await response.json();

      this.logResult({
        step: 'List Supported Tokens',
        success: response.ok && Array.isArray(data.networks),
        data,
        timestamp: Date.now(),
      });

      return response.ok;
    } catch (error: any) {
      this.logResult({
        step: 'List Supported Tokens',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  async checkUserBalance(): Promise<boolean> {
    try {
      const rpcUrl = RPC_URLS[NETWORK as keyof typeof RPC_URLS];
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Check AVAX balance (not required for user, but good to know)
      const avaxBalance = await provider.getBalance(this.wallet.address);
      
      // Check token balance
      const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
      const token = new ethers.Contract(this.tokenAddress, tokenAbi, provider);
      const tokenBalance = await token.balanceOf(this.wallet.address);

      this.logResult({
        step: 'Check User Balance',
        success: true,
        data: {
          address: this.wallet.address,
          avaxBalance: ethers.formatEther(avaxBalance),
          tokenBalance: ethers.formatUnits(tokenBalance, 6), // Assuming 6 decimals
        },
        timestamp: Date.now(),
      });

      return true;
    } catch (error: any) {
      this.logResult({
        step: 'Check User Balance',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  async checkAllowance(): Promise<boolean> {
    try {
      const rpcUrl = RPC_URLS[NETWORK as keyof typeof RPC_URLS];
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const tokenAbi = ['function allowance(address,address) view returns (uint256)'];
      const token = new ethers.Contract(this.tokenAddress, tokenAbi, provider);
      const allowance = await token.allowance(this.wallet.address, A402_RELAYER_ADDRESS);

      const allowanceFormatted = ethers.formatUnits(allowance, 6);
      const hasAllowance = allowance > 0n;

      this.logResult({
        step: 'Check Token Allowance',
        success: true,
        data: {
          token: this.tokenAddress,
          spender: A402_RELAYER_ADDRESS,
          allowance: allowanceFormatted,
          hasAllowance,
          message: hasAllowance 
            ? 'User has approved relayer to spend tokens ✓' 
            : 'User needs to approve relayer first! Run: cast send <token> "approve(address,uint256)" <relayer> <amount> --rpc-url <rpc> --private-key <key>',
        },
        timestamp: Date.now(),
      });

      return true;
    } catch (error: any) {
      this.logResult({
        step: 'Check Token Allowance',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  createAuthorization(recipientAddress: string, amountInTokens: string): Authorization {
    const decimals = 6; // USDT/USDC have 6 decimals
    const value = ethers.parseUnits(amountInTokens, decimals).toString();
    const now = Math.floor(Date.now() / 1000);
    
    return {
      from: this.wallet.address,
      to: recipientAddress,
      value,
      validAfter: now - 60, // Valid from 1 minute ago (to handle clock skew)
      validBefore: now + 3600, // Valid for 1 hour
      nonce: ethers.hexlify(ethers.randomBytes(32)),
    };
  }

  async signAuthorization(authorization: Authorization): Promise<string> {
    const domain = {
      name: 'A402',
      version: '1',
      chainId: this.chainId,
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

    const signature = await this.wallet.signTypedData(domain, types, authorization);
    return signature;
  }

  async testVerify(authorization: Authorization, signature: string): Promise<boolean> {
    try {
      const payload = {
        paymentPayload: {
          token: this.tokenAddress,
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

      const response = await fetch(`${FACILITATOR_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      this.logResult({
        step: 'Verify Payment Authorization',
        success: response.ok && data.isValid,
        data,
        timestamp: Date.now(),
      });

      return data.isValid;
    } catch (error: any) {
      this.logResult({
        step: 'Verify Payment Authorization',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  async testSettle(authorization: Authorization, signature: string): Promise<boolean> {
    try {
      const payload = {
        paymentPayload: {
          token: this.tokenAddress,
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

      const response = await fetch(`${FACILITATOR_URL}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      this.logResult({
        step: 'Settle Payment On-Chain',
        success: response.ok && data.success,
        data,
        timestamp: Date.now(),
      });

      if (data.transaction) {
        const explorerUrl = NETWORK === 'mainnet'
          ? `https://snowtrace.io/tx/${data.transaction}`
          : `https://testnet.snowtrace.io/tx/${data.transaction}`;
        console.log(`   🔗 View on Snowtrace: ${explorerUrl}\n`);
      }

      return data.success;
    } catch (error: any) {
      this.logResult({
        step: 'Settle Payment On-Chain',
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  printSummary() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.step}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  async runFullTest(recipientAddress: string, amount: string) {
    console.log('🚀 Starting A402 Full Integration Test\n');

    // Pre-flight checks
    const healthOk = await this.testFacilitatorHealth();
    if (!healthOk) {
      console.error('❌ Facilitator is not healthy. Aborting test.');
      return;
    }

    await this.testListTokens();
    await this.checkUserBalance();
    await this.checkAllowance();

    // Create and sign authorization
    console.log(`💳 Creating payment: ${amount} USDT to ${recipientAddress}\n`);
    const authorization = this.createAuthorization(recipientAddress, amount);
    const signature = await this.signAuthorization(authorization);

    console.log('🔏 Authorization Details:');
    console.log('   From:', authorization.from);
    console.log('   To:', authorization.to);
    console.log('   Amount:', ethers.formatUnits(authorization.value, 6), 'USDT');
    console.log('   Nonce:', authorization.nonce);
    console.log('   Signature:', signature.slice(0, 20) + '...');
    console.log('');

    // Test verify
    const verifyOk = await this.testVerify(authorization, signature);
    if (!verifyOk) {
      console.error('❌ Verification failed. Aborting settlement.');
      this.printSummary();
      return;
    }

    // Test settle
    console.log('⏳ Settling payment on-chain (this may take a few seconds)...\n');
    await this.testSettle(authorization, signature);

    // Print summary
    this.printSummary();
  }
}

// Main execution
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const recipientAddress = args[0] || process.env.TEST_RECIPIENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const amount = args[1] || '1'; // Default 1 USDT

  if (!ethers.isAddress(recipientAddress)) {
    console.error('❌ Invalid recipient address');
    console.log('Usage: ts-node test-a402.ts <recipient-address> <amount>');
    console.log('Example: ts-node test-a402.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 10');
    process.exit(1);
  }

  const tester = new A402Tester();
  await tester.runFullTest(recipientAddress, amount);
}

main().catch((error) => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});

