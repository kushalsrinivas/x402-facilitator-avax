// Simple Backend API for Frontend
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const REWARD_TOKEN_ADDRESS = '0xCB17a4c168a228A626e235bEBBdfe05942658fC3';
const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
const B402_RELAYER = '0xd67eF16fa445101Ef1e1c6A9FB9F3014f1d60DE6';
const FACILITATOR_URL = 'http://localhost:3402';

if (!AGENT_PRIVATE_KEY) {
  console.error('❌ AGENT_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
const agentWallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);

const TOKEN_ABI = ['function mintReward(address to) external'];

/**
 * Process Payment: Verify, Settle, and Mint
 */
app.post('/process-payment', async (req, res) => {
  try {
    const { authorization, signature, userAddress } = req.body;

    console.log('\n💰 Processing payment for:', userAddress);

    // Create b402 payload
    const payload = {
      x402Version: 1,
      scheme: 'exact',
      network: 'bsc-testnet',
      token: USDT_ADDRESS,
      payload: {
        authorization,
        signature
      }
    };

    const requirements = {
      scheme: 'exact',
      network: 'bsc-testnet',
      asset: USDT_ADDRESS,
      payTo: agentWallet.address,
      maxAmountRequired: authorization.value,
      maxTimeoutSeconds: 600,
      relayerContract: B402_RELAYER
    };

    // Step 1: Verify with facilitator
    console.log('  1. Verifying signature...');
    const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload: payload,
        paymentRequirements: requirements
      })
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.isValid) {
      throw new Error('Payment verification failed: ' + verifyData.invalidReason);
    }
    console.log('  ✅ Verified');

    // Step 2: Settle payment
    console.log('  2. Settling payment...');
    const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload: payload,
        paymentRequirements: requirements
      })
    });

    const settleData = await settleRes.json();
    if (!settleData.success) {
      throw new Error('Payment settlement failed: ' + settleData.errorReason);
    }
    console.log('  ✅ Settled:', settleData.transaction);

    // Step 3: Mint reward tokens
    console.log('  3. Minting reward tokens...');
    const rewardToken = new ethers.Contract(REWARD_TOKEN_ADDRESS, TOKEN_ABI, agentWallet);
    const mintTx = await rewardToken.mintReward(userAddress, { gasLimit: 200000 });
    const mintReceipt = await mintTx.wait();
    console.log('  ✅ Minted:', mintReceipt.hash);

    console.log('✅ Complete!\n');

    res.json({
      success: true,
      paymentTx: settleData.transaction,
      mintTx: mintReceipt.hash
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: agentWallet.address,
    rewardToken: REWARD_TOKEN_ADDRESS
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🌐 Frontend API Server');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🔑 Agent: ${agentWallet.address}`);
  console.log('');
});
