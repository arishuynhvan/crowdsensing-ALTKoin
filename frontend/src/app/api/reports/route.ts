import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { getUserBySessionToken } from "@/lib/server/authDb";

export const runtime = "nodejs";

type VoteType = "up" | "down";
type ResolveDecision = "approve" | "reject";

function resolveDataDir(): string {
  const cwd = process.cwd();
  if (path.basename(cwd) === "frontend") {
    return path.join(cwd, "src", "app", "data");
  }
  return path.join(cwd, "frontend", "src", "app", "data");
}

const dataDir = resolveDataDir();
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "reports.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter TEXT,
    reporter_hashed_id TEXT,
    content TEXT NOT NULL,
    content_hash TEXT,
    metadata_url TEXT,
    payload_hash TEXT,
    report_timestamp INTEGER,
    location_text TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image_cids TEXT NOT NULL DEFAULT '[]',
    score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Chờ kiểm duyệt',
    timestamp INTEGER NOT NULL,
    onchain_report_id INTEGER,
    last_tx_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS report_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    voter TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, voter),
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
  );
`);

const reportColumns = db
  .prepare("PRAGMA table_info(reports)")
  .all() as Array<{ name: string }>;
const reportColumnNames = new Set(reportColumns.map((c) => c.name));
if (!reportColumnNames.has("location_text")) {
  db.exec(`ALTER TABLE reports ADD COLUMN location_text TEXT NOT NULL DEFAULT 'Unknown';`);
}
if (!reportColumnNames.has("latitude")) {
  db.exec(`ALTER TABLE reports ADD COLUMN latitude REAL NOT NULL DEFAULT 0;`);
}
if (!reportColumnNames.has("longitude")) {
  db.exec(`ALTER TABLE reports ADD COLUMN longitude REAL NOT NULL DEFAULT 0;`);
}
if (!reportColumnNames.has("reporter_hashed_id")) {
  db.exec(`ALTER TABLE reports ADD COLUMN reporter_hashed_id TEXT;`);
}
if (!reportColumnNames.has("content_hash")) {
  db.exec(`ALTER TABLE reports ADD COLUMN content_hash TEXT;`);
}
if (!reportColumnNames.has("metadata_url")) {
  db.exec(`ALTER TABLE reports ADD COLUMN metadata_url TEXT;`);
}
if (!reportColumnNames.has("payload_hash")) {
  db.exec(`ALTER TABLE reports ADD COLUMN payload_hash TEXT;`);
}
if (!reportColumnNames.has("report_timestamp")) {
  db.exec(`ALTER TABLE reports ADD COLUMN report_timestamp INTEGER;`);
}

function parseImageCids(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeReport(row: {
  id: number;
  reporter: string | null;
  reporter_hashed_id: string | null;
  content: string;
  content_hash: string | null;
  metadata_url: string | null;
  payload_hash: string | null;
  report_timestamp: number | null;
  location_text: string;
  latitude: number;
  longitude: number;
  image_cids: string;
  score: number;
  status: string;
  timestamp: number;
  onchain_report_id: number | null;
  last_tx_hash: string | null;
}) {
  const txUrl =
    row.last_tx_hash && /^0x[a-fA-F0-9]{64}$/.test(row.last_tx_hash)
      ? `https://sepolia.etherscan.io/tx/${row.last_tx_hash}`
      : null;
  return {
    id: row.id,
    reporter: row.reporter,
    reporterHashedId: row.reporter_hashed_id,
    content: row.content,
    contentHash: row.content_hash,
    metadataUrl: row.metadata_url,
    payloadHash: row.payload_hash,
    reportTimestamp: row.report_timestamp,
    location: row.location_text,
    latitude: row.latitude,
    longitude: row.longitude,
    cids: parseImageCids(row.image_cids),
    score: row.score,
    status: row.status,
    timestamp: row.timestamp,
    onchainReportId: row.onchain_report_id,
    lastTxHash: row.last_tx_hash,
    txUrl,
  };
}

export async function GET() {
  const rows = db
    .prepare(
      `SELECT id, reporter, reporter_hashed_id, content, content_hash, metadata_url, payload_hash, report_timestamp,
              image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
             , location_text, latitude, longitude
       FROM reports
       ORDER BY score DESC, timestamp DESC`
    )
    .all() as Array<{
    id: number;
    reporter: string | null;
    reporter_hashed_id: string | null;
    content: string;
    content_hash: string | null;
    metadata_url: string | null;
    payload_hash: string | null;
    report_timestamp: number | null;
    location_text: string;
    latitude: number;
    longitude: number;
    image_cids: string;
    score: number;
    status: string;
    timestamp: number;
    onchain_report_id: number | null;
    last_tx_hash: string | null;
  }>;

  return NextResponse.json(rows.map(normalizeReport));
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const sessionUser = token ? getUserBySessionToken(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (sessionUser.role !== "CIT") {
      return NextResponse.json(
        { error: "Chỉ công dân mới được gửi báo cáo." },
        { status: 403 }
      );
    }

    const {
      content,
      cids,
      reporter,
      reporterHashedId,
      contentHash,
      metadataUrl,
      payloadHash,
      reportTimestamp,
      onchainReportId,
      txHash,
      location,
      latitude,
      longitude,
    } = await req.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Nội dung báo cáo là bắt buộc." }, { status: 400 });
    }
    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json({ error: "Vị trí là bắt buộc." }, { status: 400 });
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Tọa độ lat/lng không hợp lệ." }, { status: 400 });
    }
    if (!Number.isInteger(onchainReportId) || onchainReportId < 0) {
      return NextResponse.json(
        { error: "Báo cáo phải có onchainReportId hợp lệ trước khi lưu." },
        { status: 400 }
      );
    }
    if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: "Báo cáo phải có transaction hash on-chain hợp lệ." },
        { status: 400 }
      );
    }
    if (reporter && reporter.toLowerCase() !== sessionUser.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Ví gửi báo cáo không khớp ví của tài khoản đăng nhập." },
        { status: 403 }
      );
    }
    if (reporterHashedId && reporterHashedId !== sessionUser.identifier) {
      return NextResponse.json(
        { error: "Reporter hashed id không khớp tài khoản đăng nhập." },
        { status: 403 }
      );
    }

    const imageCids = Array.isArray(cids) ? cids : [];
    const timestamp = Date.now();
    const info = db
      .prepare(
        `INSERT INTO reports (
          reporter, reporter_hashed_id, content, content_hash, metadata_url, payload_hash, report_timestamp,
          location_text, latitude, longitude,
          image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Chờ kiểm duyệt', ?, ?, ?)`
      )
      .run(
        reporter ?? null,
        reporterHashedId ?? null,
        content.trim(),
        contentHash ?? null,
        metadataUrl ?? null,
        payloadHash ?? null,
        Number.isFinite(reportTimestamp) ? reportTimestamp : Date.now(),
        location.trim(),
        latitude,
        longitude,
        JSON.stringify(imageCids),
        timestamp,
        onchainReportId,
        txHash
      );

    const row = db
      .prepare(
        `SELECT id, reporter, reporter_hashed_id, content, content_hash, metadata_url, payload_hash, report_timestamp,
                location_text, latitude, longitude, image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
         FROM reports WHERE id = ?`
      )
      .get(info.lastInsertRowid) as {
      id: number;
      reporter: string | null;
      reporter_hashed_id: string | null;
      content: string;
      content_hash: string | null;
      metadata_url: string | null;
      payload_hash: string | null;
      report_timestamp: number | null;
      location_text: string;
      latitude: number;
      longitude: number;
      image_cids: string;
      score: number;
      status: string;
      timestamp: number;
      onchain_report_id: number | null;
      last_tx_hash: string | null;
    };

    return NextResponse.json(normalizeReport(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Không thể tạo báo cáo." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const sessionUser = token ? getUserBySessionToken(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body?.action as "vote" | "resolve" | undefined;
    const reportId = Number(body?.id);

    if (!Number.isInteger(reportId) || reportId < 1) {
      return NextResponse.json({ error: "Report ID không hợp lệ." }, { status: 400 });
    }

    const existing = db
      .prepare(
        `SELECT id, reporter, reporter_hashed_id, content, content_hash, metadata_url, payload_hash, report_timestamp,
                image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
             , location_text, latitude, longitude
         FROM reports WHERE id = ?`
      )
      .get(reportId) as
      | {
          id: number;
          reporter: string | null;
          reporter_hashed_id: string | null;
          content: string;
          content_hash: string | null;
          metadata_url: string | null;
          payload_hash: string | null;
          report_timestamp: number | null;
          location_text: string;
          latitude: number;
          longitude: number;
          image_cids: string;
          score: number;
          status: string;
          timestamp: number;
          onchain_report_id: number | null;
          last_tx_hash: string | null;
        }
      | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
    }

    if (action === "vote") {
      if (sessionUser.role !== "CIT") {
        return NextResponse.json(
          { error: "Chỉ công dân mới được bỏ phiếu." },
          { status: 403 }
        );
      }
      const type = body?.type as VoteType;
      const voter = sessionUser.walletAddress || sessionUser.identifier;
      const txHash = typeof body?.txHash === "string" ? body.txHash : null;

      if (type !== "up" && type !== "down") {
        return NextResponse.json({ error: "Loại vote không hợp lệ." }, { status: 400 });
      }

      const voted = db
        .prepare("SELECT id FROM report_votes WHERE report_id = ? AND voter = ? LIMIT 1")
        .get(reportId, voter) as { id: number } | undefined;

      if (voted) {
        return NextResponse.json(
          { error: "Bạn đã vote báo cáo này rồi." },
          { status: 409 }
        );
      }

      db.prepare(
        "INSERT INTO report_votes (report_id, voter, vote_type) VALUES (?, ?, ?)"
      ).run(reportId, voter, type);

      const delta = type === "up" ? 1 : -1;
      db.prepare(
        "UPDATE reports SET score = score + ?, last_tx_hash = COALESCE(?, last_tx_hash) WHERE id = ?"
      ).run(delta, txHash, reportId);
    } else if (action === "resolve") {
      if (sessionUser.role !== "GOV") {
        return NextResponse.json(
          { error: "Chỉ admin mới được duyệt báo cáo." },
          { status: 403 }
        );
      }
      const decision = body?.decision as ResolveDecision;
      if (decision !== "approve" && decision !== "reject") {
        return NextResponse.json({ error: "Quyết định không hợp lệ." }, { status: 400 });
      }

      const nextStatus = decision === "approve" ? "Chấp thuận" : "Từ chối";
      db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(nextStatus, reportId);
    } else {
      return NextResponse.json({ error: "Action không hợp lệ." }, { status: 400 });
    }

    const updated = db
      .prepare(
        `SELECT id, reporter, reporter_hashed_id, content, content_hash, metadata_url, payload_hash, report_timestamp,
                image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
             , location_text, latitude, longitude
         FROM reports WHERE id = ?`
      )
      .get(reportId) as {
      id: number;
      reporter: string | null;
      reporter_hashed_id: string | null;
      content: string;
      content_hash: string | null;
      metadata_url: string | null;
      payload_hash: string | null;
      report_timestamp: number | null;
      location_text: string;
      latitude: number;
      longitude: number;
      image_cids: string;
      score: number;
      status: string;
      timestamp: number;
      onchain_report_id: number | null;
      last_tx_hash: string | null;
    };

    return NextResponse.json(normalizeReport(updated));
  } catch {
    return NextResponse.json({ error: "Không thể cập nhật báo cáo." }, { status: 500 });
  }
}
