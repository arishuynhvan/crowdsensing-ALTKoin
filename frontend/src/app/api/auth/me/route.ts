import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/server/authDb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    res.cookies.set({
      name: "auth_token",
      value: "",
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });
    return res;
  }

  return NextResponse.json({ user });
}
