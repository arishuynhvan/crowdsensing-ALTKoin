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
    content TEXT NOT NULL,
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
  content: string;
  image_cids: string;
  score: number;
  status: string;
  timestamp: number;
  onchain_report_id: number | null;
  last_tx_hash: string | null;
}) {
  return {
    id: row.id,
    reporter: row.reporter,
    content: row.content,
    cids: parseImageCids(row.image_cids),
    score: row.score,
    status: row.status,
    timestamp: row.timestamp,
    onchainReportId: row.onchain_report_id,
    lastTxHash: row.last_tx_hash,
  };
}

function getSessionVoter(req: NextRequest): string | null {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  const user = getUserBySessionToken(token);
  if (!user) return null;
  return user.walletAddress || user.identifier;
}

export async function GET() {
  const rows = db
    .prepare(
      `SELECT id, reporter, content, image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
       FROM reports
       ORDER BY score DESC, timestamp DESC`
    )
    .all() as Array<{
    id: number;
    reporter: string | null;
    content: string;
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
    const { content, cids, reporter, onchainReportId, txHash } = await req.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Nội dung báo cáo là bắt buộc." }, { status: 400 });
    }

    const imageCids = Array.isArray(cids) ? cids : [];
    const timestamp = Date.now();
    const info = db
      .prepare(
        `INSERT INTO reports (reporter, content, image_cids, score, status, timestamp, onchain_report_id, last_tx_hash)
         VALUES (?, ?, ?, 0, 'Chờ kiểm duyệt', ?, ?, ?)`
      )
      .run(
        reporter ?? null,
        content.trim(),
        JSON.stringify(imageCids),
        timestamp,
        Number.isInteger(onchainReportId) ? onchainReportId : null,
        txHash ?? null
      );

    const row = db
      .prepare(
        `SELECT id, reporter, content, image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
         FROM reports WHERE id = ?`
      )
      .get(info.lastInsertRowid) as {
      id: number;
      reporter: string | null;
      content: string;
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
    const body = await req.json();
    const action = body?.action as "vote" | "resolve" | undefined;
    const reportId = Number(body?.id);

    if (!Number.isInteger(reportId) || reportId < 1) {
      return NextResponse.json({ error: "Report ID không hợp lệ." }, { status: 400 });
    }

    const existing = db
      .prepare(
        `SELECT id, reporter, content, image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
         FROM reports WHERE id = ?`
      )
      .get(reportId) as
      | {
          id: number;
          reporter: string | null;
          content: string;
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
      const type = body?.type as VoteType;
      const voter = getSessionVoter(req);
      const txHash = typeof body?.txHash === "string" ? body.txHash : null;

      if (type !== "up" && type !== "down") {
        return NextResponse.json({ error: "Loại vote không hợp lệ." }, { status: 400 });
      }

      if (voter) {
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
      }

      const delta = type === "up" ? 1 : -1;
      db.prepare(
        "UPDATE reports SET score = score + ?, last_tx_hash = COALESCE(?, last_tx_hash) WHERE id = ?"
      ).run(delta, txHash, reportId);
    } else if (action === "resolve") {
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
        `SELECT id, reporter, content, image_cids, score, status, timestamp, onchain_report_id, last_tx_hash
         FROM reports WHERE id = ?`
      )
      .get(reportId) as {
      id: number;
      reporter: string | null;
      content: string;
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
