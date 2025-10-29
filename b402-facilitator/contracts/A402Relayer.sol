// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title A402Relayer
 * @notice Production-ready meta-transaction relayer for Avalanche C-Chain
 * @dev Implements EIP-3009 transferWithAuthorization for gasless payments
 *
 * IMPROVEMENTS (based on B402RelayerV2):
 * - Uses OpenZeppelin EIP712 helper for signature verification
 * - Uses ECDSA library instead of raw ecrecover
 * - Added pre-flight balance/allowance checks
 * - Uses IERC20 interface instead of low-level calls
 * - Added signed cancelAuthorization for better security
 * - Improved event structure matching EIP-3009
 *
 * Supports any ERC20 token on Avalanche C-Chain (USDT, USDC, etc.)
 * Requires user to approve this contract first: token.approve(relayer, amount)
 */
contract A402Relayer is EIP712, Ownable, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;

    // EIP-712 TypeHashes (matches EIP-3009)
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH = keccak256(
        "CancelAuthorization(address authorizer,bytes32 nonce)"
    );

    // Token whitelist (optional - can be used to restrict supported tokens)
    mapping(address => bool) public tokenWhitelist;
    bool public whitelistEnabled;

    // Authorization state mapping (authorizer => nonce => used)
    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    // Events (matches EIP-3009)
    event AuthorizationUsed(
        address indexed authorizer,
        bytes32 indexed nonce
    );

    event AuthorizationCanceled(
        address indexed authorizer,
        bytes32 indexed nonce
    );

    event TokenWhitelistUpdated(
        address indexed token,
        bool status
    );

    event WhitelistStatusChanged(bool enabled);

    constructor() EIP712("A402", "1") Ownable(msg.sender) {
        // Initialize with whitelist disabled by default
        whitelistEnabled = false;
    }

    /**
     * @notice Execute a transfer with EIP-712 authorization (EIP-3009 compatible)
     * @param token Token contract address
     * @param from Payer's address (who signed the authorization)
     * @param to Recipient's address
     * @param value Amount to transfer
     * @param validAfter Timestamp after which the authorization is valid
     * @param validBefore Timestamp before which the authorization is valid
     * @param nonce Unique nonce for replay protection
     * @param v ECDSA signature parameter
     * @param r ECDSA signature parameter
     * @param s ECDSA signature parameter
     */
    function transferWithAuthorization(
        address token,
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant whenNotPaused {
        // Security checks
        if (whitelistEnabled) {
            require(tokenWhitelist[token], "A402: Token not whitelisted");
        }
        require(to != address(0), "A402: Invalid recipient");
        require(value > 0, "A402: Invalid amount");

        // Timing validation
        require(block.timestamp >= validAfter, "A402: Authorization not yet valid");
        require(block.timestamp < validBefore, "A402: Authorization expired");

        // Nonce check
        require(!authorizationState[from][nonce], "A402: Authorization already used");

        // Verify signature using EIP-712
        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == from, "A402: Invalid signature");

        // Pre-flight checks (save gas on failures)
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(from) >= value, "A402: Insufficient balance");
        require(tokenContract.allowance(from, address(this)) >= value, "A402: Insufficient allowance");

        // Mark nonce as used BEFORE external call (CEI pattern)
        authorizationState[from][nonce] = true;

        // Execute transfer (reentrancy protected)
        require(
            tokenContract.transferFrom(from, to, value),
            "A402: Transfer failed"
        );

        emit AuthorizationUsed(from, nonce);
    }

    /**
     * @notice Cancel an authorization before it's used (with signature)
     * @param authorizer Address that signed the authorization
     * @param nonce Nonce to cancel
     * @param v ECDSA signature parameter
     * @param r ECDSA signature parameter
     * @param s ECDSA signature parameter
     */
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(!authorizationState[authorizer][nonce], "A402: Authorization already used");

        // Verify signature using EIP-712
        bytes32 structHash = keccak256(
            abi.encode(
                CANCEL_AUTHORIZATION_TYPEHASH,
                authorizer,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == authorizer, "A402: Invalid signature");

        // Mark authorization as used (effectively canceling it)
        authorizationState[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    /**
     * @notice Enable or disable token whitelist
     * @param enabled Whether whitelist should be enabled
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistStatusChanged(enabled);
    }

    /**
     * @notice Add or remove a token from the whitelist
     * @param token Token address
     * @param status Whether token should be whitelisted
     */
    function setTokenWhitelist(address token, bool status) external onlyOwner {
        tokenWhitelist[token] = status;
        emit TokenWhitelistUpdated(token, status);
    }

    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Check if an authorization has been used
     * @param authorizer The address that created the authorization
     * @param nonce The nonce of the authorization
     * @return Whether the authorization has been used
     */
    function isAuthorizationUsed(
        address authorizer,
        bytes32 nonce
    ) external view returns (bool) {
        return authorizationState[authorizer][nonce];
    }

    /**
     * @notice Get domain separator (for off-chain signing)
     * @return Domain separator hash
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

