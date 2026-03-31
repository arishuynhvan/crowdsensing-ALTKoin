import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  keccak256,
  parseEther,
  parseAbi,
  stringToHex,
} from "viem";
import { sepolia } from "viem/chains";

export type ReportItem = {
  id: number;
  reporter: string | null;
  reporterHashedId?: string | null;
  content: string;
  contentHash?: string | null;
  metadataUrl?: string | null;
  payloadHash?: string | null;
  reportTimestamp?: number | null;
  location: string;
  latitude: number;
  longitude: number;
  cids: string[];
  score: number;
  status: string;
  timestamp: number;
  onchainReportId: number | null;
  lastTxHash: string | null;
  txUrl?: string | null;
};

type VoteType = "up" | "down";

const PUBLIC_SERVICE_ADDRESS_ENV = process.env.NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS?.trim();
const PUBLIC_SERVICE_LEGACY_ENV = process.env.NEXT_PUBLIC_PUBLIC_SERVICE?.trim();

const PUBLIC_SERVICE_ADDRESS = (
  PUBLIC_SERVICE_ADDRESS_ENV ?? PUBLIC_SERVICE_LEGACY_ENV
) as `0x${string}` | undefined;

const RPC_URL_RAW =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
  process.env.NEXT_PUBLIC_SEPOLIA_RPC ??
  "https://ethereum-sepolia-rpc.publicnode.com";
const RPC_URL = RPC_URL_RAW.trim();
const FALLBACK_REPORT_FEE_ETH = process.env.NEXT_PUBLIC_REPORT_FEE_ETH ?? "0.001";

const publicServiceAbi = parseAbi([
  "error AlreadyRegistered()",
  "error NotRegistered()",
  "error InsufficientStake()",
  "error ReportNotFound()",
  "error AlreadyVoted()",
  "error CannotUpdateReport()",
  "error CitizenLockedError()",
  "error InvalidEconomicParams()",
  "error TransferFailed()",
  "function REPORT_FEE() view returns (uint256)",
  "function STAKE_AMOUNT() view returns (uint256)",
  "function reportCount() view returns (uint256)",
  "function stakes(address) view returns (uint256)",
  "function locked(address) view returns (bool)",
  "function treasuryBalance() view returns (uint256)",
  "function submitReport(string contentHash, string[] imageCIDs, string location) payable",
  "function voteUp(uint256 reportId)",
  "function voteDown(uint256 reportId)",
  "function adminResolve(uint256 reportId, bool approve)",
]);

export type WalletSummary = {
  walletAddress: string | null;
  role: string | null;
  requiredStakeEth: string;
  citizenStakeEth: string;
  walletEth: string;
  isLocked: boolean;
  canSubmitReport: boolean;
  history: string[];
};

export type TreasurySummary = {
  treasuryEth: string;
  contractEth: string;
  contractAddress: string | null;
  contractUrl: string | null;
  readContractUrl: string | null;
};

function mapContractError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message || "";

  if (msg.includes("AlreadyVoted")) {
    return "Bạn đã vote báo cáo này trên smart contract rồi.";
  }
  if (msg.includes("NotRegistered")) {
    return "Bạn chưa đủ stake/đăng ký để vote trên smart contract.";
  }
  if (msg.includes("CitizenLockedError")) {
    return "Tài khoản của bạn đang bị khóa trên smart contract.";
  }
  if (msg.includes("ReportNotFound")) {
    return "Báo cáo on-chain không tồn tại hoặc sai reportId.";
  }

  return fallback;
}

function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  const ethereum = (window as Window & { ethereum?: unknown }).ethereum;
  return ethereum ?? null;
}

async function ensureSepoliaChain(provider: unknown) {
  const wallet = provider as
    | {
        request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      }
    | null;
  if (!wallet?.request) {
    throw new Error("Không tìm thấy provider để chuyển network.");
  }

  const targetHex = "0xaa36a7"; // 11155111 (Sepolia)
  const current = (await wallet.request({ method: "eth_chainId" })) as string;
  if (current?.toLowerCase() === targetHex) return;

  try {
    await wallet.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (error) {
    const maybeCode = (error as { code?: number })?.code;
    if (maybeCode === 4902) {
      await wallet.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetHex,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
      return;
    }
    throw new Error(
      "Ví đang ở sai network. Vui lòng chuyển Rabby/MetaMask sang Sepolia rồi thử lại."
    );
  }
}

function assertRuntimeConfig() {
  if (
    PUBLIC_SERVICE_ADDRESS_ENV &&
    PUBLIC_SERVICE_LEGACY_ENV &&
    PUBLIC_SERVICE_ADDRESS_ENV.toLowerCase() !== PUBLIC_SERVICE_LEGACY_ENV.toLowerCase()
  ) {
    throw new Error(
      "Env contract address đang xung đột: NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS khác NEXT_PUBLIC_PUBLIC_SERVICE. Hãy giữ 1 địa chỉ duy nhất trong frontend/.env.local."
    );
  }
  if (!PUBLIC_SERVICE_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(PUBLIC_SERVICE_ADDRESS)) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS (hoặc NEXT_PUBLIC_PUBLIC_SERVICE) hợp lệ trong frontend/.env.local."
    );
  }
  if (!RPC_URL) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SEPOLIA_RPC_URL (hoặc NEXT_PUBLIC_SEPOLIA_RPC) trong frontend/.env.local."
    );
  }
}

async function submitReportOnchain(data: {
  contentHash: string;
  cids: string[];
  location: string;
  expectedWalletAddress: string;
}): Promise<{ onchainReportId: number; txHash: string }> {
  assertRuntimeConfig();
  const provider = getInjectedProvider();
  if (!provider || !PUBLIC_SERVICE_ADDRESS) {
    throw new Error("Không tìm thấy ví web3 hoặc cấu hình contract.");
  }
  await ensureSepoliaChain(provider);

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const addresses = await walletClient.requestAddresses();
  const account = addresses[0];
  if (!account) {
    throw new Error("Không lấy được địa chỉ ví từ trình duyệt.");
  }
  if (account.toLowerCase() !== data.expectedWalletAddress.toLowerCase()) {
    throw new Error(
      `Ví đang kết nối (${account}) không khớp ví đã đăng ký (${data.expectedWalletAddress}).`
    );
  }

  const reportCount = await publicClient.readContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName: "reportCount",
  });

  const fallbackStakeEth = process.env.NEXT_PUBLIC_STAKE_AMOUNT_ETH ?? "0.00002";
  let stakeAmount: bigint | null = null;
  let currentStake: bigint | null = null;
  let isLocked: boolean | null = null;
  try {
    stakeAmount = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "STAKE_AMOUNT",
    });
    currentStake = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "stakes",
      args: [account],
    });
    isLocked = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "locked",
      args: [account],
    });
  } catch {
    stakeAmount = parseEther(fallbackStakeEth);
    currentStake = null;
    isLocked = null;
  }

  if (isLocked === true) {
    throw new Error("Ví đang bị khóa trên smart contract (locked=true).");
  }
  if (currentStake !== null && stakeAmount !== null && currentStake < stakeAmount) {
    throw new Error(
      `Ví chưa đủ stake để gửi báo cáo. Stake hiện tại: ${formatEther(
        currentStake
      )} ETH, yêu cầu: ${formatEther(stakeAmount)} ETH. Hãy registerCitizen trên cùng contract trước.`
    );
  }

  let reportFee: bigint;
  try {
    reportFee = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "REPORT_FEE",
    });
  } catch (err) {
    if (process.env.NEXT_PUBLIC_REPORT_FEE_ETH) {
      reportFee = parseEther(FALLBACK_REPORT_FEE_ETH);
    } else {
      const detail = err instanceof Error ? err.message : "unknown";
      throw new Error(
        `Không đọc được REPORT_FEE từ contract ${PUBLIC_SERVICE_ADDRESS}. Kiểm tra NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS + NEXT_PUBLIC_SEPOLIA_RPC_URL và restart dev server. Detail: ${detail}`
      );
    }
  }

  const { request } = await publicClient.simulateContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName: "submitReport",
    args: [data.contentHash, data.cids, data.location],
    account,
    value: reportFee,
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  return {
    onchainReportId: Number(reportCount),
    txHash: hash,
  };
}

async function voteOnchain(params: {
  onchainReportId: number;
  type: VoteType;
}): Promise<string | null> {
  const provider = getInjectedProvider();
  if (!provider || !PUBLIC_SERVICE_ADDRESS) return null;
  await ensureSepoliaChain(provider);

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const addresses = await walletClient.requestAddresses();
  const account = addresses[0];
  if (!account) return null;

  const functionName = params.type === "up" ? "voteUp" : "voteDown";
  const { request } = await publicClient.simulateContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName,
    args: [BigInt(params.onchainReportId)],
    account,
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

async function resolveReportOnchain(params: {
  onchainReportId: number;
  approve: boolean;
}): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider || !PUBLIC_SERVICE_ADDRESS) {
    throw new Error("Không tìm thấy ví web3 hoặc cấu hình contract.");
  }
  await ensureSepoliaChain(provider);

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const addresses = await walletClient.requestAddresses();
  const account = addresses[0];
  if (!account) {
    throw new Error("Không lấy được địa chỉ ví admin từ trình duyệt.");
  }

  const { request } = await publicClient.simulateContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName: "adminResolve",
    args: [BigInt(params.onchainReportId), params.approve],
    account,
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function submitReport(data: {
  content: string;
  cids: string[];
  location: string;
  latitude: number;
  longitude: number;
  reporterHashedId?: string;
}) {
  const meRes = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });
  const mePayload = await meRes.json().catch(() => null);
  if (!meRes.ok || !mePayload?.user?.walletAddress) {
    throw new Error("Bạn cần đăng nhập để gửi báo cáo.");
  }
  const sessionWalletAddress = mePayload.user.walletAddress as string;
  const sessionIdentifier = mePayload.user.identifier as string;

  if (data.reporterHashedId && data.reporterHashedId !== sessionIdentifier) {
    throw new Error("Reporter hashed id không khớp tài khoản đăng nhập.");
  }

  const ensureStakeRes = await fetch("/api/auth/ensure-stake", {
    method: "POST",
    credentials: "include",
  });
  const ensureStakePayload = await ensureStakeRes.json().catch(() => null);
  if (!ensureStakeRes.ok) {
    throw new Error(
      ensureStakePayload?.error ??
        "Không thể đảm bảo stake cho ví hiện tại. Vui lòng thử lại."
    );
  }

  const timestamp = Date.now();
  const reportPayload = {
    content: data.content,
    location: data.location,
    latitude: data.latitude,
    longitude: data.longitude,
    imageUrls: data.cids,
    timestamp,
    reporterHashedId: data.reporterHashedId ?? null,
  };

  const payloadString = JSON.stringify(reportPayload);
  const payloadHash = keccak256(stringToHex(payloadString));

  let metadataUrl: string | null = null;
  try {
    const pinRes = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `report-${timestamp}.json`,
        json: reportPayload,
      }),
    });
    const pinData = await pinRes.json();
    if (pinRes.ok) {
      metadataUrl = pinData.ipfsUrl ?? pinData.url ?? null;
    }
  } catch {
    metadataUrl = null;
  }

  const onchainContent = metadataUrl
    ? `${metadataUrl}#${payloadHash}`
    : payloadHash;

  const onchain = await submitReportOnchain({
    contentHash: onchainContent,
    cids: data.cids,
    location: data.location,
    expectedWalletAddress: sessionWalletAddress,
  });

  const res = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      content: data.content,
      cids: data.cids,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      contentHash: onchainContent,
      metadataUrl,
      payloadHash,
      reportTimestamp: timestamp,
      reporterHashedId: data.reporterHashedId ?? null,
      reporter: sessionWalletAddress,
      onchainReportId: onchain.onchainReportId,
      txHash: onchain.txHash,
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error ?? "Không thể gửi báo cáo.");
  }

  return payload as ReportItem;
}

export async function getReports() {
  const res = await fetch("/api/reports", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Không thể tải danh sách báo cáo.");
  }
  return (await res.json()) as ReportItem[];
}

export async function voteReport(id: number, type: VoteType, onchainReportId?: number | null) {
  let txHash: string | null = null;

  if (typeof onchainReportId === "number") {
    try {
      txHash = await voteOnchain({ onchainReportId, type });
    } catch (err) {
      throw new Error(mapContractError(err, "Vote on-chain thất bại."));
    }
  }

  const res = await fetch("/api/reports", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      action: "vote",
      id,
      type,
      txHash,
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error ?? "Vote thất bại.");
  }

  return payload as ReportItem;
}

export async function approveReport(id: number) {
  const reports = await getReports();
  const report = reports.find((r) => r.id === id);
  if (!report || typeof report.onchainReportId !== "number") {
    throw new Error("Báo cáo chưa có on-chain report id hợp lệ để duyệt.");
  }
  const txHash = await resolveReportOnchain({
    onchainReportId: report.onchainReportId,
    approve: true,
  });

  const res = await fetch("/api/reports", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      action: "resolve",
      id,
      decision: "approve",
      txHash,
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error ?? "Không thể duyệt báo cáo.");
  }
  return payload as ReportItem;
}

export async function rejectReport(id: number) {
  const reports = await getReports();
  const report = reports.find((r) => r.id === id);
  if (!report || typeof report.onchainReportId !== "number") {
    throw new Error("Báo cáo chưa có on-chain report id hợp lệ để từ chối.");
  }
  const txHash = await resolveReportOnchain({
    onchainReportId: report.onchainReportId,
    approve: false,
  });

  const res = await fetch("/api/reports", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      action: "resolve",
      id,
      decision: "reject",
      txHash,
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error ?? "Không thể từ chối báo cáo.");
  }
  return payload as ReportItem;
}

export async function getWallet() {
  const res = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    return {
      walletAddress: null,
      role: null,
      requiredStakeEth: "0",
      citizenStakeEth: "0",
      walletEth: "0",
      isLocked: false,
      canSubmitReport: false,
      history: [] as string[],
    } as WalletSummary;
  }

  const payload = await res.json();
  const walletAddress = payload?.user?.walletAddress as `0x${string}` | undefined;
  const role = (payload?.user?.role as string | undefined) ?? null;
  if (!walletAddress || !PUBLIC_SERVICE_ADDRESS) {
    return {
      walletAddress: walletAddress ?? null,
      role,
      requiredStakeEth: "0",
      citizenStakeEth: "0",
      walletEth: "0",
      isLocked: false,
      canSubmitReport: false,
      history: payload?.user
        ? [`Ví: ${payload.user.walletAddress}`, `Vai trò: ${payload.user.role}`]
        : [],
    } as WalletSummary;
  }

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  let requiredStake = 0n;
  let citizenStake = 0n;
  let walletEth = 0n;
  let isLocked = false;
  try {
    requiredStake = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "STAKE_AMOUNT",
    });
    citizenStake = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "stakes",
      args: [walletAddress],
    });
    isLocked = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "locked",
      args: [walletAddress],
    });
    walletEth = await publicClient.getBalance({ address: walletAddress });
  } catch {
    // keep fallback zero values if RPC temporarily fails
  }

  const canSubmitReport = !isLocked && citizenStake >= requiredStake && requiredStake > 0n;
  return {
    walletAddress,
    role,
    requiredStakeEth: formatEther(requiredStake),
    citizenStakeEth: formatEther(citizenStake),
    walletEth: formatEther(walletEth),
    isLocked,
    canSubmitReport,
    history: payload?.user
      ? [`Ví: ${payload.user.walletAddress}`, `Vai trò: ${payload.user.role}`]
      : [],
  } as WalletSummary;
}

export async function getTreasurySummary(): Promise<TreasurySummary> {
  if (!PUBLIC_SERVICE_ADDRESS) {
    return {
      treasuryEth: "0",
      contractEth: "0",
      contractAddress: null,
      contractUrl: null,
      readContractUrl: null,
    };
  }

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  let treasury = 0n;
  let contractEth = 0n;
  try {
    treasury = await publicClient.readContract({
      address: PUBLIC_SERVICE_ADDRESS,
      abi: publicServiceAbi,
      functionName: "treasuryBalance",
    });
    contractEth = await publicClient.getBalance({
      address: PUBLIC_SERVICE_ADDRESS,
    });
  } catch {
    // keep fallback zero values if RPC temporarily fails
  }

  const contractUrl = `https://sepolia.etherscan.io/address/${PUBLIC_SERVICE_ADDRESS}`;
  return {
    treasuryEth: formatEther(treasury),
    contractEth: formatEther(contractEth),
    contractAddress: PUBLIC_SERVICE_ADDRESS,
    contractUrl,
    readContractUrl: `${contractUrl}#readContract`,
  };
}
