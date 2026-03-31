# Installation

```bash
# Initialize npm if you haven't already
npm init -y

# Install Hardhat and essential plugins
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

# Setup wallets

**Generate 4 funded Sepolia wallets (1 Admin + 3 Citizens)** for full testing. Here's exact setup:

## 1. Generate All Wallets with Hardhat

```bash
cd contracts
```

**Admin Wallet (Account #0):**
```bash
npx hardhat account --index 0 --save --network sepolia
# Copy: ADMIN_ADDRESS + ADMIN_PRIVATE_KEY
```

**Citizen Wallets (Accounts #1-3):**
```bash
npx hardhat account --index 1 --save --network sepolia  # Citizen 1
npx hardhat account --index 2 --save --network sepolia  # Citizen 2  
npx hardhat account --index 3 --save --network sepolia  # Citizen 3
```

## 2. Google Crypto Faucet Strategy (4 Gmail Accounts)

**1. Create/Use 4 Gmail Accounts**

**2. Fund Each Wallet (Google Crypto Library)**
```
1. Visit https://faucet.gcp.cloud (Google's official Sepolia faucet)
2. Login with Gmail #1 → Get Admin wallet address → Request 0.5 ETH
3. Logout → Login Gmail #2 → Citizen1 wallet → 0.5 ETH
4. Repeat for all 4 accounts
```

**3. Backup Faucets (if Google limits)**
```
https://sepoliafaucet.com (no Gmail needed)
https://faucet.polygon.technology (Twitter login)
https://sepolia-faucet.pk910.de/ (simple)
https://faucet.quicknode.com/ethereum/sepolia (email)
```

**Each gets 0.2-0.5 ETH → Total testing budget: ~1.5 ETH FREE**

## 3. Environment Setup (contracts/.env)
```bash
echo "ADMIN_PRIVATE_KEY=0x..." >> .env
echo "CITIZEN1_PRIVATE_KEY=0x..." >> .env
echo "CITIZEN2_PRIVATE_KEY=0x..." >> .env  
echo "CITIZEN3_PRIVATE_KEY=0x..." >> .env
```

## 4. Deploy Script (Sets Admin Role)
```javascript
// contracts/scripts/deploy-sepolia.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners(); // Admin wallet
  
  console.log("Admin Deployer:", deployer.address);
  
  // Deploy contract
  const PublicService = await ethers.getContractFactory("PublicService");
  const service = await PublicService.deploy();
  await service.waitForDeployment();
  
  // Set Admin role
  await service.grantAdminRole(deployer.address);
  
  console.log("\n🎉 DEPLOYMENT COMPLETE");
  console.log("Contract:     ", await service.getAddress());
  console.log("Admin:        ", deployer.address);
  console.log("Explorer:     https://sepolia.etherscan.io/address/" + await service.getAddress());
}

main().catch(console.error);
```

## 5. Full Test Accounts Summary
```
ADMIN_WALLET=0x71097549E8e0b9A1c5dd9dB23aE0d3c8dC62846D  (account #0)
CITIZEN1=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC   (account #1) 
CITIZEN2=0x90F79bf... (account #2)
CITIZEN3=0xFFcf8F... (account #3)

All have 0.2-0.5 Sepolia ETH each
```

## 6. Frontend Multi-Wallet Config
```bash
# frontend/.env.local
NEXT_PUBLIC_RPC_URL=AlchemyURL
NEXT_PUBLIC_PUBLIC_SERVICE=0xDeployedContract
TEST_WALLETS="0x7109...,0x3C44...,0x90F7...,0xFFcf..."
```

## 7. Deploy & Test Commands
### Deploy Command (Either RPC)
```bash
cd contracts
npx hardhat run scripts/deploy-sepolia.cjs --network sepolia
```

### Verify RPC Works First
```bash
cd contracts
npx hardhat console --network sepolia
> await ethers.provider.getBlockNumber()  // Should return ~50M
```

##  Flow on Etherscan:
```
Tx1: Admin deployment + grantAdminRole
Tx2-4: 3x Citizen registerCitizen() + stake payments  
Tx5-7: 3x submitReport() + report fees
Tx8-9: Citizens voteUp/Down
Tx10: Admin approve/reject → payouts
```

## 8. Deployed Contract
###### Old
Deploying contracts with the account: 0x4570FDbd50e25C1E80836e73099b4f7BFABDEbd6
PublicService deployed to: 0x1f7c6EAa4D0777Bcc1764Af9157721254aF1D313
Verify on Sepolia Etherscan: https://sepolia.etherscan.io/address/0x1f7c6EAa4D0777Bcc1764Af9157721254aF1D313

###### New
Hardhat Ignition 🚀

Deploying [ PublicServiceModule ]

Batch #1
  Executed PublicServiceModule#PublicService

[ PublicServiceModule ] successfully deployed 🚀

Deployed Addresses

PublicServiceModule#PublicService - 0xE1125a60CD4EdE61c0F21f9172d3a5eC67Ed10d2
https://sepolia.etherscan.io/address/0xE1125a60CD4EdE61c0F21f9172d3a5eC67Ed10d2#code

Contract deployed to Sepolia successfully.

###### Final

Deployer: 0x4570FDbd50e25C1E80836e73099b4f7BFABDEbd6
New PublicService address: 0xa8A0BF6dcCF2113d49306E24B9a98Cf8D7DF32D1
Explorer: https://sepolia.etherscan.io/address/0xa8A0BF6dcCF2113d49306E24B9a98Cf8D7DF32D1