import { NextRequest, NextResponse } from "next/server";
import { registerCitizen } from "@/lib/server/authDb";

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
    const { name, cccd, phone, address, password, deposit } = await req.json();

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

    const depositValue = Number(deposit);
    if (!Number.isFinite(depositValue) || depositValue <= 0) {
      return NextResponse.json(
        { error: "Phí ký quỹ phải lớn hơn 0 để kích hoạt tài khoản." },
        { status: 400 }
      );
    }

    const user = registerCitizen({
      name,
      cccd,
      phone,
      address,
      password,
      deposit: depositValue,
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
