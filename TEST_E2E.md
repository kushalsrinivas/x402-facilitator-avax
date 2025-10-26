# B402 Protocol - End-to-End Testing Guide

## ✅ Testnet Deployment Complete

**Contract Address (BSC Testnet):** `0x083232131AD5613d84abd5a506854F4C80a721f3`
**BSCScan:** https://testnet.bscscan.com/address/0x083232131AD5613d84abd5a506854F4C80a721f3
**Network:** BSC Testnet (Chain ID: 97)

---

## 🚀 Quick Start - Test End-to-End

### Step 1: Start Facilitator Service

```bash
cd b402-facilitator
npm run dev
```

Expected output:
```
🔥 b402 Facilitator Service
📡 Listening on http://localhost:3402
🔑 Relayer: 0x40D85e646AfE73eC45981f69273625f7C769E494
📝 Contract: 0x083232131AD5613d84abd5a506854F4C80a721f3

Ready to process BNB Chain payments! 🚀
```

### Step 2: Run Demo Payment

In a new terminal:

```bash
cd ..
npm run test
```

This will:
1. Create a test user wallet
2. Request testnet USDT from faucet (if needed)
3. Approve relayer contract
4. Sign payment authorization
5. Submit to facilitator
6. Execute on-chain transfer

---

## 🔍 Manual Testing Steps

### 1. Get Testnet Tokens

**BNB Testnet Faucet:**
- https://testnet.bnbchain.org/faucet-smart
- Request 0.5 BNB (for gas + testing)

**USDT Testnet Contract:** `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`

**Get Testnet USDT:**
```javascript
// Connect to BSC Testnet in MetaMask
// Add custom token: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
// Use faucet or ask in BSC Telegram
```

### 2. Approve Relayer Contract

```javascript
// In MetaMask or web3 console
const USDT = new ethers.Contract(
  "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
  ["function approve(address spender, uint256 amount) returns (bool)"],
  signer
);

await USDT.approve(
  "0x083232131AD5613d84abd5a506854F4C80a721f3",
  ethers.parseUnits("1000", 6) // Approve 1000 USDT
);
```

### 3. Sign Payment Authorization

```javascript
const domain = {
  name: "B402",
  version: "1",
  chainId: 97,
  verifyingContract: "0x083232131AD5613d84abd5a506854F4C80a721f3"
};

const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};

const authorization = {
  from: "YOUR_ADDRESS",
  to: "MERCHANT_ADDRESS",
  value: "1000000", // 1 USDT (6 decimals)
  validAfter: Math.floor(Date.now() / 1000) - 60,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: ethers.randomBytes(32)
};

const signature = await signer.signTypedData(domain, types, authorization);
```

### 4. Submit to Facilitator

```bash
curl -X POST http://localhost:3402/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "token": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
      "payload": {
        "authorization": {
          "from": "YOUR_ADDRESS",
          "to": "MERCHANT_ADDRESS",
          "value": "1000000",
          "validAfter": 1234567890,
          "validBefore": 1234571490,
          "nonce": "0x..."
        },
        "signature": "0x..."
      }
    },
    "paymentRequirements": {
      "relayerContract": "0x083232131AD5613d84abd5a506854F4C80a721f3",
      "network": "bsc"
    }
  }'
```

Expected response:
```json
{
  "isValid": true,
  "payer": "0x..."
}
```

### 5. Settle Payment

```bash
curl -X POST http://localhost:3402/settle \
  -H "Content-Type: application/json" \
  -d '{ ... same payload as verify ... }'
```

Expected response:
```json
{
  "success": true,
  "transaction": "0x...",
  "network": "bsc",
  "payer": "0x...",
  "blockNumber": 12345
}
```

---

## ✅ Test Checklist

- [ ] Facilitator service starts without errors
- [ ] Health endpoint responds: `curl http://localhost:3402/health`
- [ ] User can approve relayer contract
- [ ] User can sign payment authorization
- [ ] `/verify` endpoint validates signature correctly
- [ ] `/settle` endpoint executes on-chain transfer
- [ ] Transaction appears on BSCScan testnet
- [ ] USDT balance changes reflect correctly
- [ ] Nonce cannot be reused (replay protection)

---

## 🐛 Troubleshooting

### "Authorization not yet valid"
- Check `validAfter` timestamp is in the past
- Use `Math.floor(Date.now() / 1000) - 60`

### "Authorization expired"
- Check `validBefore` timestamp is in the future
- Use `Math.floor(Date.now() / 1000) + 3600`

### "Insufficient allowance"
- User must approve relayer first: `USDT.approve(relayer, amount)`

### "Invalid signature"
- Check domain separator matches contract
- Verify chainId is 97 (testnet)
- Ensure all values match exactly

### "Transfer failed"
- Check user has sufficient USDT balance
- Verify approval amount is sufficient
- Confirm token address is correct

---

## 📊 Monitoring

Watch facilitator logs:
```bash
tail -f b402-facilitator/logs/facilitator.log
```

Check contract events on BSCScan:
https://testnet.bscscan.com/address/0x083232131AD5613d84abd5a506854F4C80a721f3#events

---

## 🎯 Success Metrics

For 100k users, monitor:
- ✅ Transaction success rate (target: >99%)
- ✅ Average settlement time (target: <10 seconds)
- ✅ Gas cost per transaction (target: ~$0.10)
- ✅ Facilitator uptime (target: 99.9%)
- ✅ Failed transaction rate (target: <1%)

---

## 🚀 Ready for Mainnet?

Once testnet testing is complete:

1. Run deployment with mainnet config:
```bash
NETWORK=mainnet npm run deploy:mainnet
```

2. Update facilitator `.env` with mainnet contract address

3. Fund relayer wallet with BNB for gas (~1-2 BNB for 1000 transactions)

4. Start production facilitator service

5. Monitor closely for first 100 transactions

---

## 📞 Support

Issues? Check:
- Facilitator logs: `b402-facilitator/logs/`
- Contract events on BSCScan
- Network status: https://testnet.bnbchain.org

