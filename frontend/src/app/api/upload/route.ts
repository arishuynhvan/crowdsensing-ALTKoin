import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud/ipfs";

function unauthorizedConfigResponse() {
  return NextResponse.json(
    {
      error:
        "Missing PINATA_JWT. Set PINATA_JWT in frontend/.env.local to enable IPFS upload.",
    },
    { status: 500 }
  );
}

export async function POST(req: NextRequest) {
  if (!PINATA_JWT) {
    return unauthorizedConfigResponse();
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file, file.name);
    pinataForm.append(
      "pinataMetadata",
      JSON.stringify({
        name: file.name,
      })
    );

    const pinRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataForm,
    });

    if (!pinRes.ok) {
      const errText = await pinRes.text();
      return NextResponse.json(
        { error: `Pinata file upload failed: ${errText}` },
        { status: 502 }
      );
    }

    const data = (await pinRes.json()) as { IpfsHash: string };
    const cid = data.IpfsHash;
    return NextResponse.json({
      cid,
      url: `${PINATA_GATEWAY}/${cid}`,
      ipfsUrl: `ipfs://${cid}`,
    });
  }

  const body = (await req.json()) as { json?: unknown; name?: string };
  if (typeof body?.json === "undefined") {
    return NextResponse.json({ error: "Missing json payload." }, { status: 400 });
  }

  const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: body.json,
      pinataMetadata: {
        name: body.name ?? "report-metadata.json",
      },
    }),
  });

  if (!pinRes.ok) {
    const errText = await pinRes.text();
    return NextResponse.json(
      { error: `Pinata JSON upload failed: ${errText}` },
      { status: 502 }
    );
  }

  const data = (await pinRes.json()) as { IpfsHash: string };
  const cid = data.IpfsHash;
  return NextResponse.json({
    cid,
    url: `${PINATA_GATEWAY}/${cid}`,
    ipfsUrl: `ipfs://${cid}`,
  });
}
