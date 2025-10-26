# 🚀 B402 - Send USDT with ZERO Gas Fees!

## TL;DR

**Send USDT on BSC for FREE. Pay $0 in gas fees. Forever.**

---

## What is B402?

B402 lets you send USDT (and other tokens) on Binance Smart Chain **without paying gas fees**.

### The Problem:
- Sending crypto normally costs $0.50+ in gas fees
- Small payments ($1-10) become expensive
- Need to keep BNB for gas (annoying!)

### The Solution (B402):
- ✅ Send USDT for $0 gas
- ✅ Only pay ~$0.10 ONCE (first approval)
- ✅ All future payments are FREE
- ✅ Works on BSC Mainnet (real money!)

---

## How Does It Work?

```
You → Sign payment (offline, no gas)
     ↓
B402 Facilitator → Verifies signature
                 → Pays gas for you!
     ↓
✅ USDT transferred (you paid $0)
```

**Security:**
- You keep full control of your funds
- Facilitator can't steal (no access to your wallet)
- Every payment needs your signature
- All transactions visible on BSCScan

---

## 3 Ways to Use B402

### Option 1: Web Interface (Easiest!)

1. **Open the web app:**
   ```
   Open: b402-frontend/index.html in your browser
   ```

2. **Connect MetaMask:**
   - Click "Connect Wallet"
   - Approve in MetaMask

3. **One-Time Approval (~$0.10 gas):**
   - Click "Approve Relayer"
   - Pay small gas fee (only once!)

4. **Send USDT for FREE:**
   - Enter recipient address
   - Enter amount (e.g., 0.1 USDT)
   - Click "Send Payment"
   - Sign (no gas!)
   - Done! ✅

---

### Option 2: Command Line Script

**Quick send from terminal:**

```bash
# Install dependencies (first time only)
npm install

# Send USDT
PRIVATE_KEY=0x... tsx send-usdt.ts <recipient> <amount>

# Example: Send 0.1 USDT
PRIVATE_KEY=0xYOUR_KEY tsx send-usdt.ts 0xa23beff60ad1b91f35e91476475f9e3eba0897d7 0.1
```

**Output:**
```
🚀 B402 Gasless USDT Transfer
════════════════════════════════════════════════════════

📋 Transaction Details:
   From:       0x26e824...768e
   To:         0xa23bef...897d7
   Amount:     0.1 USDT
   Network:    BSC Mainnet
   Gas Cost:   $0.00 (facilitator pays!)

💰 Your Balance:
   2.029955081068830239 USDT

🔍 Checking approval...
   ✅ Already approved

✍️  Signing payment (no gas!)...
   ✅ Signed!

🔍 Verifying with facilitator...
   ✅ Verified!

💸 Executing payment (facilitator pays gas!)...
   ✅ Success!

🎉 Payment Complete!
════════════════════════════════════════════════════════

📊 Transaction:
   Hash:       0x85b93193e46e84f93f929742e53fe36b1fe7186ba1df2d5d4644bae3c13c78cc
   Block:      66018790
   BSCScan:    https://bscscan.com/tx/0x85b9...

💡 You paid $0 in gas!
   Facilitator covered all fees for you.
```

---

### Option 3: Custom Integration (For Developers)

```typescript
import { ethers } from 'ethers';

const FACILITATOR_URL = 'https://your-facilitator.railway.app';
const RELAYER_CONTRACT = '0xE1C2830d5DDd6B49E9c46EbE03a98Cb44CD8eA5a';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// 1. Sign authorization (no gas!)
const authorization = {
    from: userAddress,
    to: recipientAddress,
    value: ethers.parseUnits('0.1', 6), // 0.1 USDT
    validAfter: Math.floor(Date.now() / 1000) - 60,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    nonce: ethers.hexlify(ethers.randomBytes(32))
};

const domain = {
    name: 'B402',
    version: '1',
    chainId: 56, // BSC Mainnet
    verifyingContract: RELAYER_CONTRACT
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

const signature = await signer.signTypedData(domain, types, authorization);

// 2. Send to facilitator (they pay gas!)
const payload = {
    paymentPayload: {
        token: USDT_ADDRESS,
        payload: { authorization, signature }
    },
    paymentRequirements: {
        relayerContract: RELAYER_CONTRACT,
        network: 'bsc'
    }
};

// Verify
const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

// Settle
const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

const result = await settleRes.json();
console.log(`✅ Paid! Tx: ${result.transaction}`);
```

---

## Setup Guide

### Prerequisites:

1. **MetaMask Wallet**
   - Install: https://metamask.io
   - Switch to BSC Mainnet

2. **Some USDT on BSC**
   - Buy on Binance and withdraw to BSC
   - Or bridge from other chains

3. **Small amount of BNB (~$0.20)**
   - Only needed for ONE-TIME approval
   - Get from: https://binance.com

### First-Time Setup:

**Step 1: Add BSC Network to MetaMask (if not added)**
- Network Name: BSC Mainnet
- RPC URL: https://bsc-dataseed.binance.org
- Chain ID: 56
- Currency Symbol: BNB
- Block Explorer: https://bscscan.com

**Step 2: Get USDT on BSC**
- Buy USDT on Binance
- Withdraw to your MetaMask address
- Select "BSC" network (NOT Ethereum!)

**Step 3: Get BNB for ONE approval**
- Buy ~$1 worth of BNB
- Only need $0.10, but get extra for safety

**Step 4: Use B402!**
- Open web interface or run script
- Approve once (~$0.10 gas)
- Send unlimited payments for FREE! 🎉

---

## Cost Comparison

### Without B402:
| Action | Gas Cost |
|--------|----------|
| Send USDT | ~$0.50 |
| Send 10 times | $5.00 |
| Send 100 times | $50.00 |

### With B402:
| Action | Gas Cost |
|--------|----------|
| Approve (once) | ~$0.10 |
| Send USDT | $0.00 ✅ |
| Send 10 times | $0.00 ✅ |
| Send 100 times | $0.00 ✅ |

**Savings for 100 transactions: $49.90!**

---

## Use Cases

### 1. **Tipping Content Creators**
```
Send $1 tips to 100 creators
Without B402: $50 in gas
With B402: $0 in gas
Savings: $50!
```

### 2. **Micropayments**
```
Pay $0.50 for a coffee
Without B402: $0.50 + $0.50 gas = $1.00
With B402: $0.50 + $0 gas = $0.50
Savings: 50%!
```

### 3. **Payroll**
```
Pay 50 employees weekly
Without B402: $25/week in gas = $1,300/year
With B402: $0/week in gas = $0/year
Savings: $1,300/year!
```

### 4. **Gaming / NFTs**
```
Buy 20 in-game items @ $2 each
Without B402: $40 items + $10 gas = $50
With B402: $40 items + $0 gas = $40
Savings: $10!
```

---

## FAQ

**Q: Is this safe?**
A: Yes! You sign every payment. B402 can't access your wallet or change amounts. All transactions are public on BSCScan.

**Q: Who pays the gas?**
A: The B402 facilitator pays gas for you. They cover ~$0.02 per transaction.

**Q: How do they make money?**
A: They can charge a small fee (0.1%) or subscription ($5/month for unlimited).

**Q: What if the facilitator goes down?**
A: You can submit transactions directly to the contract (you pay gas). Your funds are NEVER locked.

**Q: Can I use other tokens?**
A: Currently USDT. Soon: USDC, BUSD, DAI. Any ERC20 token can be added!

**Q: Why do I need to approve first?**
A: Standard ERC20 requirement. You authorize the contract to move USDT on your behalf.

**Q: Does approval expire?**
A: No! One approval = unlimited gasless transactions forever.

**Q: Can I cancel a payment?**
A: Yes, before it's submitted. After submission, it's final (like any blockchain tx).

**Q: Is my private key safe?**
A: Your key never leaves your device. You only sign messages locally.

**Q: What's the transaction speed?**
A: ~5 seconds on BSC (same as regular transfers).

**Q: Are there limits?**
A: No minimum or maximum. Send $0.01 or $10,000 with $0 gas!

**Q: Can I use on mobile?**
A: Yes! Use MetaMask mobile browser to access the web interface.

---

## Technical Details (For Nerds 🤓)

**Contract:** `0xE1C2830d5DDd6B49E9c46EbE03a98Cb44CD8eA5a`
**USDT:** `0x55d398326f99059fF775485246999027B3197955`
**Chain:** BSC Mainnet (56)

**How it works:**
1. EIP-712 typed signatures
2. EIP-3009 transferWithAuthorization
3. Meta-transaction relay pattern
4. Nonce-based replay protection

**Gas usage:** ~103k gas per transaction
**Security:** Audited, ReentrancyGuard, token whitelist

**View on BSCScan:**
https://bscscan.com/address/0xE1C2830d5DDd6B49E9c46EbE03a98Cb44CD8eA5a

---

## Troubleshooting

### Issue: "Please switch to BSC Mainnet"
**Fix:** In MetaMask, switch network to "BSC Mainnet" (Chain ID: 56)

### Issue: "Insufficient balance"
**Fix:** Get USDT on BSC first. Buy from Binance and withdraw to BSC network.

### Issue: "Need BNB for approval"
**Fix:** Get small amount of BNB (~$0.20). Only needed once.

### Issue: "Transaction failed"
**Fix:**
1. Check you have enough USDT balance
2. Make sure you approved the relayer
3. Try again (might be network congestion)

### Issue: "Facilitator not responding"
**Fix:** Check facilitator URL is correct. If down, contact support.

---

## Support

**Issues?** Create ticket at: https://github.com/b402/protocol/issues

**Questions?** Join Discord: https://discord.gg/b402

**Email:** support@b402.ai

---

## Quick Start Checklist

- [ ] Install MetaMask
- [ ] Add BSC Mainnet network
- [ ] Get USDT on BSC
- [ ] Get ~$0.20 BNB for approval
- [ ] Open b402-frontend/index.html
- [ ] Connect wallet
- [ ] Approve relayer ($0.10 gas)
- [ ] Send USDT for FREE! 🎉

---

## Examples

### Example 1: Tip a Creator

```bash
# Send 1 USDT tip (costs $0 in gas!)
PRIVATE_KEY=0x... tsx send-usdt.ts 0xCREATOR_ADDRESS 1
```

### Example 2: Pay for Coffee

```bash
# Send 0.5 USDT for coffee (costs $0 in gas!)
PRIVATE_KEY=0x... tsx send-usdt.ts 0xCAFE_ADDRESS 0.5
```

### Example 3: Split Bill with Friends

```bash
# Send 5 USDT to each friend (costs $0 in gas!)
PRIVATE_KEY=0x... tsx send-usdt.ts 0xFRIEND1 5
PRIVATE_KEY=0x... tsx send-usdt.ts 0xFRIEND2 5
PRIVATE_KEY=0x... tsx send-usdt.ts 0xFRIEND3 5
# Total gas cost: $0 (vs $1.50 without B402)
```

---

## What Makes B402 Special?

✅ **User-Friendly:** No technical knowledge needed
✅ **Secure:** Non-custodial, you control your funds
✅ **Fast:** ~5 seconds per transaction
✅ **Cheap:** Pay $0 gas forever (after one-time approval)
✅ **Reliable:** Built on BSC, battle-tested infrastructure
✅ **Open Source:** Audited contracts, transparent code
✅ **Multi-Token:** USDT now, more tokens coming soon

---

**🚀 Start sending USDT for FREE today!**

Open [b402-frontend/index.html](b402-frontend/index.html) and get started in 2 minutes!
