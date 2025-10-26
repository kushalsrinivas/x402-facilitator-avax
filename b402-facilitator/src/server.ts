// b402 Facilitator Service - Matches x402.org API
import express from 'express';
import cors from 'cors';
import { ethers, Wallet, Contract } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const BSC_RPC = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY!;
const B402_RELAYER_ADDRESS = process.env.B402_RELAYER_ADDRESS!;

if (!RELAYER_PRIVATE_KEY || !B402_RELAYER_ADDRESS) {
  console.error('❌ Missing required env vars: RELAYER_PRIVATE_KEY, B402_RELAYER_ADDRESS');
  process.exit(1);
}

// Provider and wallet
const provider = new ethers.JsonRpcProvider(BSC_RPC);
const testnetProvider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
const relayerWallet = new Wallet(RELAYER_PRIVATE_KEY);

// B402Relayer ABI
const B402_ABI = [
  "function transferWithAuthorization(address token, address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external",
  "function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)",
];

// ERC20 Token ABI for dynamic token info
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

/**
 * Get token information dynamically from the blockchain
 * Supports any ERC20 token (USDT, USDC, BUSD, DAI, etc.)
 */
async function getTokenInfo(tokenAddress: string, provider: ethers.JsonRpcProvider) {
  try {
    const token = new Contract(tokenAddress, ERC20_ABI, provider);

    const [decimals, symbol, name] = await Promise.all([
      token.decimals(),
      token.symbol(),
      token.name()
    ]);

    return {
      decimals: Number(decimals),
      symbol,
      name
    };
  } catch (error) {
    console.warn(`⚠️  Could not fetch token info for ${tokenAddress}, using defaults`);
    // Fallback to USDT defaults if token info fetch fails
    return {
      decimals: 6,
      symbol: 'TOKEN',
      name: 'Unknown Token'
    };
  }
}

/**
 * POST /verify
 * Verify payment signature (matches x402 API)
 */
app.post('/verify', async (req, res) => {
  console.log('\n🎯 ════════════════════════════════════════════════════════');
  console.log('   PAYMENT INTENT RECEIVED');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        isValid: false,
        invalidReason: 'Missing paymentPayload or paymentRequirements',
      });
    }

    const { authorization, signature } = paymentPayload.payload;
    const network = paymentRequirements.network || 'bsc';

    // Select provider based on NETWORK env var
    const envNetwork = process.env.NETWORK || 'testnet';
    const chainId = envNetwork === 'mainnet' ? 56 : 97;
    const selectedProvider = envNetwork === 'mainnet' ? provider : testnetProvider;

    // Get token info dynamically
    const tokenInfo = await getTokenInfo(paymentPayload.token, selectedProvider);

    console.log('📋 Intent Details:');
    console.log(`   From:   ${authorization.from}`);
    console.log(`   To:     ${authorization.to}`);
    console.log(`   Token:  ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`   Amount: ${ethers.formatUnits(authorization.value, tokenInfo.decimals)} ${tokenInfo.symbol}`);
    console.log(`   Nonce:  ${authorization.nonce.slice(0, 20)}...`);
    console.log(`   Network: ${network}`);
    console.log('');
    console.log('🔍 Verifying signature...');

    // Create relayer contract instance
    const relayer = new Contract(
      B402_RELAYER_ADDRESS,
      B402_ABI,
      selectedProvider
    );

    // Verify signature locally (EIP-712)
    const domain = {
      name: "B402",
      version: "1",
      chainId: chainId,
      verifyingContract: paymentRequirements.relayerContract,
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

    console.log('🔑 Domain:', JSON.stringify(domain, null, 2));
    console.log('📝 Authorization:', JSON.stringify({
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce
    }, null, 2));

    const recovered = ethers.verifyTypedData(domain, types, authorization, signature);

    console.log(`   Expected signer: ${authorization.from}`);
    console.log(`   Recovered signer: ${recovered}`);

    if (recovered.toLowerCase() !== authorization.from.toLowerCase()) {
      console.log('❌ Signature verification FAILED');
      console.log('');
      return res.json({
        isValid: false,
        invalidReason: "Invalid signature",
      });
    }

    console.log('✅ Signature verified!');
    console.log(`   Signer: ${recovered}`);

    // Check nonce not used
    const isUsed = await relayer.authorizationState(authorization.from, authorization.nonce);
    if (isUsed) {
      return res.json({
        isValid: false,
        invalidReason: "Nonce already used",
      });
    }

    // Check timing
    const now = Math.floor(Date.now() / 1000);
    if (now < authorization.validAfter) {
      return res.json({
        isValid: false,
        invalidReason: "Authorization not yet valid",
      });
    }
    if (now >= authorization.validBefore) {
      return res.json({
        isValid: false,
        invalidReason: "Authorization expired",
      });
    }

    console.log('✅ All checks passed!');
    console.log('');
    console.log('════════════════════════════════════════════════════════\n');

    res.json({
      isValid: true,
      payer: authorization.from,
    });
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({
      isValid: false,
      invalidReason: error.message,
    });
  }
});

/**
 * POST /settle
 * Execute payment on-chain (matches x402 API)
 */
app.post('/settle', async (req, res) => {
  console.log('\n💰 ════════════════════════════════════════════════════════');
  console.log('   SETTLING PAYMENT ON-CHAIN');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        success: false,
        network: 'bsc',
        errorReason: 'Missing paymentPayload or paymentRequirements',
      });
    }

    const { authorization, signature } = paymentPayload.payload;
    const network = paymentRequirements.network || 'bsc';

    // Select provider based on NETWORK env var
    const envNetwork = process.env.NETWORK || 'testnet';
    const chainId = envNetwork === 'mainnet' ? 56 : 97;
    const selectedProvider = envNetwork === 'mainnet' ? provider : testnetProvider;
    const signer = relayerWallet.connect(selectedProvider);
    const relayer = new Contract(
      B402_RELAYER_ADDRESS,
      B402_ABI,
      signer
    );

    // Get token info dynamically
    const tokenInfo = await getTokenInfo(paymentPayload.token, selectedProvider);

    // Split signature
    const sig = ethers.Signature.from(signature);

    // Execute transferWithAuthorization
    console.log('📤 Submitting transaction to BSC Testnet...');
    console.log(`   ${authorization.from} → ${authorization.to}`);
    console.log(`   Token:  ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`   Amount: ${ethers.formatUnits(authorization.value, tokenInfo.decimals)} ${tokenInfo.symbol}`);
    console.log(`   Contract: ${paymentPayload.token}`);
    console.log(`   Relayer: ${B402_RELAYER_ADDRESS}`);
    console.log('');

    const tx = await relayer.transferWithAuthorization(
      paymentPayload.token, // USDT address
      authorization.from,
      authorization.to,
      authorization.value,
      authorization.validAfter,
      authorization.validBefore,
      authorization.nonce,
      sig.v,
      sig.r,
      sig.s,
      {
        gasLimit: 200000 // Sufficient for transferFrom
      }
    );

    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   ⏳ Waiting for confirmation...');
    console.log('');
    const receipt = await tx.wait();
    console.log(`✅ Payment settled successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log('');
    console.log('════════════════════════════════════════════════════════\n');

    res.json({
      success: true,
      transaction: receipt.hash,
      network,
      payer: authorization.from,
      blockNumber: receipt.blockNumber,
    });
  } catch (error: any) {
    console.error('Settle error:', error);
    res.status(500).json({
      success: false,
      network: req.body.paymentRequirements?.network || 'bsc',
      errorReason: error.message,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'b402-facilitator',
    network: 'bsc',
    relayer: relayerWallet.address,
  });
});

const PORT = process.env.PORT || 3402;

app.listen(PORT, () => {
  console.log('🔥 b402 Facilitator Service');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🔑 Relayer: ${relayerWallet.address}`);
  console.log(`📝 Contract: ${B402_RELAYER_ADDRESS}`);
  console.log('');
  console.log('Ready to process BNB Chain payments! 🚀');
});
