import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseAbi,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { getReservedPrivateKeyForWallet, getUserBySessionToken } from "@/lib/server/authDb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getUserBySessionToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fromAddress = process.env.NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS?.trim();
    const fromLegacy = process.env.NEXT_PUBLIC_PUBLIC_SERVICE?.trim();
    if (
      fromAddress &&
      fromLegacy &&
      fromAddress.toLowerCase() !== fromLegacy.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Env contract address đang xung đột: NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS khác NEXT_PUBLIC_PUBLIC_SERVICE. Hãy giữ 1 địa chỉ duy nhất.",
        },
        { status: 500 }
      );
    }
    const contractAddress = (fromAddress ?? fromLegacy) as `0x${string}` | undefined;
    const rpcUrl =
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
      process.env.NEXT_PUBLIC_SEPOLIA_RPC ??
      process.env.SEPOLIA_RPC_URL;
    if (!contractAddress || !rpcUrl) {
      return NextResponse.json(
        { error: "Missing contract/rpc env for ensure-stake." },
        { status: 500 }
      );
    }

    const abi = parseAbi([
      "function STAKE_AMOUNT() view returns (uint256)",
      "function stakes(address) view returns (uint256)",
      "function locked(address) view returns (bool)",
      "function registerCitizen() payable",
    ]);

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });

    const fallbackStakeEth = process.env.NEXT_PUBLIC_STAKE_AMOUNT_ETH ?? "0.00002";

    let stakeAmount: bigint;
    try {
      stakeAmount = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "STAKE_AMOUNT",
      });
    } catch {
      stakeAmount = parseEther(fallbackStakeEth);
    }

    let currentStake: bigint | null = null;
    let isLocked = false;
    try {
      currentStake = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "stakes",
        args: [user.walletAddress as `0x${string}`],
      });
      isLocked = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "locked",
        args: [user.walletAddress as `0x${string}`],
      });
    } catch {
      currentStake = null;
      isLocked = false;
    }

    if (currentStake !== null && currentStake >= stakeAmount && !isLocked) {
      return NextResponse.json({
        ok: true,
        stakeEth: formatEther(currentStake),
        requiredStakeEth: formatEther(stakeAmount),
        txHash: null,
      });
    }

    const privateKey = getReservedPrivateKeyForWallet(user.walletAddress);
    if (!privateKey) {
      return NextResponse.json(
        {
          error:
            "Wallet hiện tại không thuộc pool ví dự phòng có private key trên backend, không thể auto-stake.",
        },
        { status: 409 }
      );
    }

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Preflight funds check for silent registerCitizen() from backend wallet.
    // The wallet must have enough for stake value + transaction gas.
    const balance = await publicClient.getBalance({ address: account.address });
    const gasPrice = await publicClient.getGasPrice();
    const estimatedGas = await publicClient.estimateContractGas({
      address: contractAddress,
      abi,
      functionName: "registerCitizen",
      account: account.address,
      value: stakeAmount,
    });
    const totalNeeded = stakeAmount + estimatedGas * gasPrice;
    if (balance < totalNeeded) {
      return NextResponse.json(
        {
          error: `Ví ${account.address} không đủ ETH để auto-stake. Cần tối thiểu ${formatEther(
            totalNeeded
          )} ETH (stake + gas), hiện có ${formatEther(balance)} ETH.`,
        },
        { status: 409 }
      );
    }

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi,
      functionName: "registerCitizen",
      value: stakeAmount,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    let latestStake = stakeAmount;
    try {
      latestStake = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "stakes",
        args: [user.walletAddress as `0x${string}`],
      });
    } catch {
      latestStake = stakeAmount;
    }

    return NextResponse.json({
      ok: true,
      txHash: hash,
      stakeEth: formatEther(latestStake),
      requiredStakeEth: formatEther(stakeAmount),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown ensure-stake error";
    return NextResponse.json(
      { error: `ensure-stake failed: ${detail}` },
      { status: 500 }
    );
  }
}
