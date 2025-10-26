# B402 vs x402: Technical Comparison

## Overview

B402 and Coinbase's x402 both enable gasless payments but use fundamentally different approaches.

## Architecture Comparison

### B402 (This Implementation)

**Design Pattern:** Relayer-based gasless transactions

**How it works:**
1. User approves relayer contract: `USDT.approve(relayer, amount)`
2. User signs EIP-712 authorization off-chain
3. Facilitator submits transaction to relayer contract
4. Relayer verifies signature and calls `transferFrom`
5. Gas paid by facilitator/relayer

**Token Requirements:**
- Any standard ERC20 token
- Requires one-time approval transaction
- Works with USDT, USDC, or any ERC20

**Signature Standard:** EIP-712 (typed structured data)

**Contract Function:**
```solidity
function transferWithAuthorization(
    address token,
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v, bytes32 r, bytes32 s
) external
```

### x402 (Coinbase)

**Design Pattern:** Native token feature (EIP-3009)

**How it works:**
1. User signs authorization off-chain (no approval needed)
2. Anyone can submit the signed authorization to the token contract
3. Token contract verifies signature and executes transfer directly
4. Gas paid by transaction submitter

**Token Requirements:**
- Token MUST natively implement EIP-3009
- USDC has native support on most chains
- USDT does NOT have EIP-3009 support
- Limited token availability

**Signature Standard:** EIP-3009 (subset of EIP-712)

**Token Function (native):**
```solidity
// Called on the token contract itself, not a relayer
function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes signature
) external
```

## Key Differences

### 1. Token Compatibility

**B402:**
- Works with any ERC20 token
- USDT: Yes
- USDC: Yes
- Custom tokens: Yes
- Requires approval

**x402:**
- Only EIP-3009 native tokens
- USDT: No (lacks EIP-3009)
- USDC: Yes (native EIP-3009)
- Custom tokens: Only if they implement EIP-3009
- No approval needed

### 2. User Experience

**B402:**
- Initial setup: User must call `approve(relayer, amount)`
- Subsequent payments: Sign authorization (gasless)
- Approval can be set to unlimited for convenience

**x402:**
- Initial setup: None required
- All payments: Sign authorization (gasless)
- Truly one-step for every transaction

### 3. Implementation Complexity

**B402:**
- Requires deploying relayer contract
- Contract manages signature verification
- Works on any EVM chain
- Facilitator needs gas token (BNB) for submissions

**x402:**
- No custom contract needed
- Token handles signature verification
- Limited to chains where EIP-3009 tokens exist
- Facilitator needs native gas token

### 4. Security Model

**B402:**
- Relayer contract holds approval rights
- Token whitelist controls which assets are supported
- Pausable for emergencies
- Single point of trust (relayer contract)

**x402:**
- No approval needed (lower risk)
- Signature authorizes direct transfer
- Trust distributed to token contracts
- Depends on token contract security

## Why B402 Uses Relayer Pattern

### BSC Token Reality

BSC mainnet USDT contract: `0x55d398326f99059fF775485246999027B3197955`

This contract does NOT implement:
- `transferWithAuthorization` (EIP-3009)
- `permit` (EIP-2612)
- Any gasless transfer functions

It's a standard ERC20 implementation.

### Solutions Considered

**Option 1: Wait for EIP-3009 USDT**
- Status: Not available on BSC
- Timeline: Unknown/unlikely
- Verdict: Not viable

**Option 2: Only support USDC**
- USDC has EIP-3009 on some chains
- Not available on BSC mainnet
- Verdict: Too limited

**Option 3: Relayer Pattern (chosen)**
- Works with existing BSC USDT
- Flexible for any ERC20 token
- Proven pattern (used by GSN, Biconomy, etc.)
- Verdict: Most practical

## Naming Clarification

### Is B402 "EIP-3009 compatible"?

**Current claim:** "Implements EIP-3009 transferWithAuthorization"

**Accurate description:** "Provides EIP-3009-like interface via relayer pattern"

**Why it matters:**
- True EIP-3009 means token has native support
- B402 is a relayer that mimics the interface
- Functionally similar, architecturally different

### Recommended Terminology

**Instead of:**
> "B402 implements EIP-3009 transferWithAuthorization"

**Say:**
> "B402 provides gasless payments using EIP-712 signatures and a relayer contract, offering similar functionality to EIP-3009 but compatible with standard ERC20 tokens"

## Use Case Comparison

### When to Use B402

- Building on BSC (mainnet or testnet)
- Need to support USDT
- Want flexibility for multiple tokens
- Don't mind one-time approval step
- Want full control over relayer logic

### When to Use x402

- Building on Base, Ethereum, or Solana
- USDC is sufficient
- Want true one-step payments
- Prefer no approval step
- Building on chains with EIP-3009 token availability

## Both Are Valid Approaches

Neither approach is "better" - they solve different problems:

**B402:** Practical solution for chains/tokens lacking native gasless support

**x402:** Cleaner UX when native token support exists

## Future Evolution

### Path to EIP-3009 Native

If BSC USDT ever adds native EIP-3009:

1. Deploy new relayer that calls token's native function
2. Users get no-approval experience
3. Backward compatible with old relayer
4. Migration path for existing users

### Cross-Protocol Bridge

Possible to build facilitator that supports both:
- B402 relayer pattern for BSC/USDT
- x402 native pattern for Base/USDC
- Same API surface for clients
- Network-specific backend logic

## Conclusion

B402 and x402 are complementary approaches to the same problem. B402 uses a relayer pattern to bring gasless payments to chains and tokens that lack native support, while x402 leverages native token features where available.

For BSC with USDT, the relayer pattern is the correct technical choice.
