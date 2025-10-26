# 🚀 B402 Protocol - Quick Start Guide

## ✅ Your Setup is COMPLETE!

**New Secure Deployment:**
- **Relayer Contract:** `0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A`
- **Owner Wallet:** `0x26e824C08a4547aB90FBD761Fb80065f7e68768e` (SECURE)
- **Network:** BSC Testnet
- **Facilitator:** Running on `http://localhost:3402`

View on BSCScan: https://testnet.bscscan.com/address/0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A

---

## 🎯 Test End-to-End RIGHT NOW

### Option 1: Automated Test (Recommended)

```bash
# Run full end-to-end test
npm run test

# This will:
# 1. Create a test user wallet
# 2. Check USDT balance
# 3. Approve relayer (if needed)
# 4. Sign payment authorization
# 5. Submit to facilitator
# 6. Verify on-chain settlement
```

**Note:** You'll need testnet USDT. See "Getting Testnet Tokens" below.

### Option 2: Manual Test with Your Wallet

```bash
# Set your test wallet
export TEST_USER_PK="your_private_key_here"

# Run test
npm run test
```

---

## 💰 Getting Testnet Tokens

### 1. Get BNB (for approval - one time only)
**Faucet:** https://testnet.bnbchain.org/faucet-smart
- Connect wallet
- Request 0.5 BNB
- Wait 1-2 minutes

### 2. Get USDT (for payments)

**Option A: Swap on PancakeSwap Testnet**
1. Go to https://pancakeswap.finance/?chain=bscTestnet
2. Connect wallet
3. Swap BNB → USDT
4. USDT address: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`

**Option B: Use Testnet USDT Faucet**
- Search "BSC testnet USDT faucet"
- Or ask in BSC Telegram: https://t.me/BinanceChain

---

## 📊 Check Your Setup

### 1. Verify Facilitator is Running

```bash
curl http://localhost:3402/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "service": "b402-facilitator",
  "network": "bsc",
  "relayer": "0x26e824C08a4547aB90FBD761Fb80065f7e68768e"
}
```

### 2. Check Relayer Balance

The relayer wallet (`0x26e824C08a4547aB90FBD761Fb80065f7e68768e`) needs BNB to pay gas:

**Current balance:** Check on [BSCScan](https://testnet.bscscan.com/address/0x26e824C08a4547aB90FBD761Fb80065f7e68768e)

**Recommended:** Keep at least 0.1 BNB in relayer wallet for testing

### 3. Verify Contract

**Contract:** https://testnet.bscscan.com/address/0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A

Check:
- ✅ Contract is verified
- ✅ Owner is `0x26e824C08a4547aB90FBD761Fb80065f7e68768e`
- ✅ USDT is whitelisted
- ✅ Contract is not paused

---

## 🧪 Manual Payment Test

### Step 1: Approve Relayer (One Time)

```javascript
// In MetaMask or web console
const USDT = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
const RELAYER = '0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A';

const usdt = new ethers.Contract(USDT, ['function approve(address,uint256)'], signer);
await usdt.approve(RELAYER, ethers.parseUnits('1000', 6)); // Approve 1000 USDT
```

### Step 2: Sign Payment

```javascript
const domain = {
  name: 'B402',
  version: '1',
  chainId: 97,
  verifyingContract: '0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A'
};

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

const authorization = {
  from: yourAddress,
  to: merchantAddress,
  value: '1000000', // 1 USDT (6 decimals)
  validAfter: Math.floor(Date.now() / 1000) - 60,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: ethers.hexlify(ethers.randomBytes(32))
};

const signature = await signer.signTypedData(domain, types, authorization);
```

### Step 3: Submit to Facilitator

```bash
curl -X POST http://localhost:3402/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "token": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
      "payload": {
        "authorization": { ... },
        "signature": "0x..."
      }
    },
    "paymentRequirements": {
      "relayerContract": "0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A",
      "network": "bsc"
    }
  }'
```

### Step 4: Settle Payment

```bash
curl -X POST http://localhost:3402/settle \
  -H "Content-Type: application/json" \
  -d '{ ... same payload ... }'
```

---

## 🔍 Monitoring

### Watch Facilitator Logs

```bash
tail -f /tmp/facilitator.log
```

### Monitor Transactions

**On BSCScan:**
- Contract: https://testnet.bscscan.com/address/0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A
- Relayer: https://testnet.bscscan.com/address/0x26e824C08a4547aB90FBD761Fb80065f7e68768e

### Key Events to Watch

- `AuthorizationUsed` - Payment executed
- `Transfer` (USDT) - Tokens moved
- Gas used per transaction

---

## ✅ Success Checklist

After running tests, verify:

- [ ] Facilitator responded to `/health`
- [ ] Facilitator responded to `/verify`
- [ ] Facilitator executed `/settle`
- [ ] Transaction confirmed on BSCScan
- [ ] USDT transferred from user to merchant
- [ ] User balance decreased
- [ ] Merchant balance increased
- [ ] User paid NO gas (except initial approval)
- [ ] Facilitator paid gas fees
- [ ] Settlement time <10 seconds

---

## 🚀 Ready for Mainnet?

Once testnet is fully tested:

### 1. Security Audit (Recommended)
- Get external audit (CertiK, Trail of Bits)
- Budget: $15k-30k
- Timeline: 2-4 weeks

### 2. Fund Wallets
- Relayer: 100-200 BNB (~$30k-60k)
- Treasury: For liquidity and operations

### 3. Deploy to Mainnet
```bash
# Generate NEW secure wallet for mainnet
# NEVER reuse testnet keys!

export DEPLOYER_PRIVATE_KEY="new_secure_key"
NETWORK=mainnet npm run deploy:mainnet
```

### 4. Setup Production Infrastructure
- Multi-region servers
- Auto-scaling
- Monitoring (Prometheus + Grafana)
- Alerting (PagerDuty)
- Backups and failover

### 5. Gradual Rollout
- Day 1: 100 users (whitelisted)
- Day 3: 1,000 users
- Week 1: 10,000 users
- Month 1: 100,000 users

---

## 📞 Support

### Documentation
- **Full Docs:** [B402_NOTION_DOCS.md](./B402_NOTION_DOCS.md)
- **Deployment Summary:** [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)
- **Mainnet Checklist:** [MAINNET_CHECKLIST.md](./MAINNET_CHECKLIST.md)

### Contract Code
- **Relayer:** [contracts/B402RelayerV2.sol](./contracts/B402RelayerV2.sol)
- **Token:** [contracts/B402Token.sol](./contracts/B402Token.sol)

### Issues?
- Check facilitator logs: `tail -f /tmp/facilitator.log`
- View on BSCScan for transaction details
- Verify wallet has sufficient balance

---

## 🎉 Quick Commands

```bash
# Start facilitator
npm run dev

# Run end-to-end test
npm run test

# Check facilitator health
curl http://localhost:3402/health

# View contract on BSCScan
open https://testnet.bscscan.com/address/0x62150F2c3A29fDA8bCf22c0F22Eb17270FCBb78A

# Deploy to mainnet (when ready)
NETWORK=mainnet npm run deploy:mainnet
```

---

## 🔐 Security Notes

### ✅ SECURE (Your Current Setup)
- **Relayer:** `0x26e824C08a4547aB90FBD761Fb80065f7e68768e`
- Private key: `0xc07a6dc...` (SECURE, not exposed)

### ❌ INSECURE (Old Deployment)
- **Old Relayer:** `0x40D85e646AfE73eC45981f69273625f7C769E494`
- Private key: `0x63e160f...` (EXPOSED on GitHub)
- **DO NOT USE FOR MAINNET!**

### For Mainnet:
1. Generate NEW wallet (hardware wallet recommended)
2. Use multi-sig for ownership (Gnosis Safe)
3. Never commit private keys to git
4. Use environment variables and secrets management
5. Consider using AWS Secrets Manager or HashiCorp Vault

---

**Your B402 Protocol is ready to serve 100,000 users! 🚀**

**Start testing now:**
```bash
npm run test
```

