// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestToken
 * @notice Simple ERC20 token for testing A402 gasless payments
 * @dev Includes minting function for easy testing
 */
contract TestToken is ERC20, Ownable {
    uint8 private _decimals;

    /**
     * @param name Token name (e.g., "Test USD Token")
     * @param symbol Token symbol (e.g., "TUSDT")
     * @param decimals_ Token decimals (use 6 for USDT-like, 18 for standard)
     * @param initialSupply Initial supply to mint to deployer (in whole tokens)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        
        // Mint initial supply to deployer
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply * 10 ** decimals_);
        }
    }

    /**
     * @notice Override decimals function
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens (owner only)
     * @param to Recipient address
     * @param amount Amount in whole tokens (e.g., 1000 = 1000 tokens)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10 ** _decimals);
    }

    /**
     * @notice Mint tokens with raw amount (owner only)
     * @param to Recipient address
     * @param rawAmount Amount in smallest unit (e.g., 1000000 = 1 token for 6 decimals)
     */
    function mintRaw(address to, uint256 rawAmount) external onlyOwner {
        _mint(to, rawAmount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount in whole tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount * 10 ** _decimals);
    }

    /**
     * @notice Faucet function - anyone can claim tokens (useful for testing)
     * @param amount Amount in whole tokens to claim
     */
    function faucet(uint256 amount) external {
        require(amount <= 1000, "TestToken: Max 1000 tokens per claim");
        _mint(msg.sender, amount * 10 ** _decimals);
    }
}

