const { ethers } = require("hardhat");

// Define the event name and input types
const eventName = "Stake_Validator(uint256)";

// Compute the event signature
const eventSignature = ethers.id(eventName);

console.log("Event Signature:", eventSignature);
