# CourseLib blockchain

Hardhat 3 project for the `CourseMarketplace` Solidity contract.

## Configure Sepolia

From this directory, copy `.env.example` to `.env` and set:

- `SEPOLIA_RPC_URL` to an HTTPS Sepolia RPC endpoint from your provider.
- `SEPOLIA_PRIVATE_KEY` to a funded Sepolia deployer account key. Keep this file private.

The `.env` file is ignored by Git. Never put a real private key in source code or commit it.

## Build and deploy

```shell
npm install
npm run build
npm run deploy:sepolia
```

The deployment script checks that both Sepolia settings exist, connects to the configured Sepolia network, deploys `CourseMarketplace`, and prints its address.

## Connect Django and React

After deploying, copy the printed contract address into:

- `backend/.env` as `BLOCKCHAIN_CONTRACT_ADDRESS`, alongside `BLOCKCHAIN_RPC_URL` and `BLOCKCHAIN_CHAIN_ID=11155111`.
- `frontend/.env` as `VITE_COURSE_MARKETPLACE_ADDRESS`, alongside `VITE_BLOCKCHAIN_CHAIN_ID=11155111`.

Use the example files in `backend/` and `frontend/` as templates. Run Django migrations and restart both the Django server and Vite after setting these values. Every enrollment costs exactly `0.000001 Sepolia ETH` plus the network fee; the contract sends the enrollment payment to its owner. The API checks the contract event, transaction sender, chain, exact on-chain price, contract state, and a wallet signature before saving an enrollment to Django.
