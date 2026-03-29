import { NextRequest, NextResponse } from "next/server";
import { createSession, loginWithIdentifier } from "@/lib/server/authDb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Thiếu identifier hoặc mật khẩu." },
        { status: 400 }
      );
    }

    const user = loginWithIdentifier(identifier, password);
    if (!user) {
      return NextResponse.json(
        { error: "Thông tin đăng nhập không chính xác." },
        { status: 401 }
      );
    }

    const session = createSession(user.id);

    const res = NextResponse.json({ user });
    res.cookies.set({
      name: "auth_token",
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Đăng nhập thất bại. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
