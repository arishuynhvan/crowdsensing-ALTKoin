import { NextRequest, NextResponse } from "next/server";
import { allocateReservedCitizenWallet, registerCitizen } from "@/lib/server/authDb";
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

export const runtime = "nodejs";

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      cccd,
      phone,
      address,
      password,
      depositVnd,
      vndPerEth,
      stakeRequiredVnd,
    } = await req.json();

    if (!name || !cccd || !phone || !address || !password) {
      return NextResponse.json(
        { error: "Thiếu thông tin đăng ký bắt buộc." },
        { status: 400 }
      );
    }

    if (!/^\d{12}$/.test(cccd)) {
      return NextResponse.json({ error: "CCCD phải gồm 12 chữ số." }, { status: 400 });
    }

    if (!/^(0\d{9})$/.test(phone)) {
      return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: "Mật khẩu chưa đủ mạnh (>=8 ký tự, có hoa, thường, số)." },
        { status: 400 }
      );
    }

    const parsedDepositVnd = Number(depositVnd);
    const parsedVndPerEth = Number(vndPerEth);
    const parsedStakeRequiredVnd = Number(stakeRequiredVnd);
    if (!Number.isInteger(parsedDepositVnd) || parsedDepositVnd < 1) {
      return NextResponse.json(
        { error: "Số tiền nhập ban đầu phải là số nguyên >= 1." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(parsedVndPerEth) || parsedVndPerEth <= 0) {
      return NextResponse.json({ error: "Tỷ giá VND/ETH không hợp lệ." }, { status: 400 });
    }
    if (!Number.isInteger(parsedStakeRequiredVnd) || parsedStakeRequiredVnd <= 0) {
      return NextResponse.json(
        { error: "Số tiền VND tối thiểu theo stake on-chain không hợp lệ." },
        { status: 400 }
      );
    }
    if (parsedDepositVnd < parsedStakeRequiredVnd) {
      return NextResponse.json(
        {
          error: `Số tiền nạp (${parsedDepositVnd.toLocaleString(
            "vi-VN"
          )} VND) chưa đủ, cần tối thiểu ${parsedStakeRequiredVnd.toLocaleString(
            "vi-VN"
          )} VND để cover stake on-chain.`,
        },
        { status: 400 }
      );
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
    const contractAddress = (fromAddress ?? fromLegacy) as
      | `0x${string}`
      | undefined;
    const rpcUrl =
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
      process.env.NEXT_PUBLIC_SEPOLIA_RPC ??
      process.env.SEPOLIA_RPC_URL;

    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: "Thiếu NEXT_PUBLIC_PUBLIC_SERVICE_ADDRESS hợp lệ trong env." },
        { status: 500 }
      );
    }
    if (!rpcUrl) {
      return NextResponse.json(
        { error: "Thiếu NEXT_PUBLIC_SEPOLIA_RPC_URL (hoặc SEPOLIA_RPC_URL) trong env." },
        { status: 500 }
      );
    }

    const { walletAddress, privateKey } = allocateReservedCitizenWallet();

    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });
    const abi = parseAbi([
      "function STAKE_AMOUNT() view returns (uint256)",
      "function stakes(address) view returns (uint256)",
      "function locked(address) view returns (bool)",
      "function registerCitizen() payable",
    ]);

    const fallbackStakeEth = process.env.NEXT_PUBLIC_STAKE_AMOUNT_ETH ?? "0.05";
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

    let currentStake = 0n;
    let isLocked = false;
    try {
      currentStake = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "stakes",
        args: [walletAddress],
      });
      isLocked = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "locked",
        args: [walletAddress],
      });
    } catch {
      currentStake = 0n;
      isLocked = false;
    }

    let onchainRegisterTxHash: `0x${string}` | null = null;
    if (currentStake < stakeAmount || isLocked) {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName: "registerCitizen",
        value: stakeAmount,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      onchainRegisterTxHash = hash;
    }

    const user = registerCitizen({
      name,
      cccd,
      phone,
      address,
      password,
      depositVnd: parsedDepositVnd,
      vndPerEth: parsedVndPerEth,
      stakeRequiredVnd: parsedStakeRequiredVnd,
      walletAddress,
      stakeEth: formatEther(stakeAmount),
      onchainRegisterTxHash,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Đăng ký thất bại. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
