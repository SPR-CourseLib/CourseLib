import "dotenv/config";
import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY;

export default defineConfig({
  plugins: [hardhatEthers],
  solidity: "0.8.24",
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL ?? "http://127.0.0.1:8545",
      accounts: sepoliaPrivateKey ? [sepoliaPrivateKey] : [],
    },
  },
});
