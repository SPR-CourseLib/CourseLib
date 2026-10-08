const chainId = Number(import.meta.env.VITE_BLOCKCHAIN_CHAIN_ID || 11155111);
const contractAddress = import.meta.env.VITE_COURSE_MARKETPLACE_ADDRESS;
const enrollSelector = "0xf57d585b";
const enrollmentPriceSelector = "0xece4682c";

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function isWalletAvailable() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function startCourseEnrollment(courseId) {
  if (!isWalletAvailable()) {
    throw new Error("Встановіть MetaMask або відкрийте сайт у браузері з EVM-гаманцем.");
  }
  if (!contractAddress || !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
    throw new Error("Адреса контракту не налаштована для фронтенду.");
  }

  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!account) {
    throw new Error("Під’єднайте гаманець, щоб записатися на курс.");
  }

  const expectedChainId = `0x${chainId.toString(16)}`;
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId.toLowerCase() !== expectedChainId.toLowerCase()) {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: expectedChainId }],
    });
  }

  const priceResult = await window.ethereum.request({
    method: "eth_call",
    params: [{ to: contractAddress, data: enrollmentPriceSelector }, "latest"],
  });
  const enrollmentPrice = BigInt(priceResult);
  const encodedCourseId = BigInt(courseId).toString(16).padStart(64, "0");
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: account,
      to: contractAddress,
      data: `${enrollSelector}${encodedCourseId}`,
      value: `0x${enrollmentPrice.toString(16)}`,
    }],
  });

  let receipt;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) break;
    await wait(2000);
  }

  if (!receipt) {
    throw new Error(`Транзакція ще не підтверджена. Її хеш: ${txHash}`);
  }
  if (receipt.status !== "0x1") {
    throw new Error("Транзакція запису не пройшла в блокчейні.");
  }

  return { account, txHash, enrollmentPrice };
}

export async function signEnrollment(txHash, account, courseId) {
  const message = `CourseLib enrollment\nCourse: ${courseId}\nTransaction: ${txHash.toLowerCase()}\nChain ID: ${chainId}`;
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, account],
  });
  return { wallet_address: account, tx_hash: txHash, signature };
}
