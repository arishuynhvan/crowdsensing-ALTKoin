import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseAbi,
} from "viem";
import { sepolia } from "viem/chains";

export type ReportItem = {
  id: number;
  reporter: string | null;
  content: string;
  location: string;
  latitude: number;
  longitude: number;
  cids: string[];
  score: number;
  status: string;
  timestamp: number;
  onchainReportId: number | null;
  lastTxHash: string | null;
};

type VoteType = "up" | "down";

const PUBLIC_SERVICE_ADDRESS =
  (process.env.NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS as `0x${string}` | undefined) ??
  "0xb73AabB713CC106814A778FaAA34A8992fA445DE";

const RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
  "https://ethereum-sepolia-rpc.publicnode.com";

const publicServiceAbi = parseAbi([
  "function REPORT_FEE() view returns (uint256)",
  "function reportCount() view returns (uint256)",
  "function submitReport(string contentHash, string[] imageCIDs, string location) payable",
  "function voteUp(uint256 reportId)",
  "function voteDown(uint256 reportId)",
]);

function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  const ethereum = (window as Window & { ethereum?: unknown }).ethereum;
  return ethereum ?? null;
}

async function submitReportOnchain(data: {
  content: string;
  cids: string[];
  location: string;
}): Promise<{ onchainReportId: number; txHash: string } | null> {
  const provider = getInjectedProvider();
  if (!provider || !PUBLIC_SERVICE_ADDRESS) return null;

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

  const reportCount = await publicClient.readContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName: "reportCount",
  });

  const reportFee = await publicClient.readContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName: "REPORT_FEE",
  });

  const { request } = await publicClient.simulateContract({
    address: PUBLIC_SERVICE_ADDRESS,
    abi: publicServiceAbi,
    functionName: "submitReport",
    args: [data.content, data.cids, data.location],
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

export async function submitReport(data: {
  content: string;
  cids: string[];
  location: string;
  latitude: number;
  longitude: number;
  reporter?: string;
}) {
  let onchain: { onchainReportId: number; txHash: string } | null = null;

  try {
    onchain = await submitReportOnchain({
      content: data.content,
      cids: data.cids,
      location: data.location,
    });
  } catch {
    onchain = null;
  }

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
      reporter: data.reporter ?? null,
      onchainReportId: onchain?.onchainReportId ?? null,
      txHash: onchain?.txHash ?? null,
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
    txHash = await voteOnchain({ onchainReportId, type });
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
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error ?? "Không thể duyệt báo cáo.");
  }
  return payload as ReportItem;
}

export async function rejectReport(id: number) {
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
    return { balance: 0, history: [] as string[] };
  }

  const payload = await res.json();
  return {
    balance: payload?.user?.isActive ? 1 : 0,
    history: payload?.user
      ? [`Ví: ${payload.user.walletAddress}`, `Vai trò: ${payload.user.role}`]
      : [],
  };
}
