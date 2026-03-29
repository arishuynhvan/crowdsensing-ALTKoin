// scripts/deploy-sepolia.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  if (!deployer) {
    console.error("Error: No deployer account found.");
    console.error("Please ensure that the PRIVATE_KEY is correctly set in your .env file");
    console.error("and that your hardhat.config.js is configured to use it for the 'sepolia' network.");
    process.exit(1);
  }

  console.log("Deploying contracts with the account:", deployer.address);

  const PublicService = await ethers.getContractFactory("PublicService");
  const publicService = await PublicService.deploy();

  await publicService.waitForDeployment();
  const contractAddress = await publicService.getAddress();

  console.log("PublicService deployed to:", contractAddress);
  console.log(`Verify on Sepolia Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
