import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define the path to the data directory and the database file
const dataDir = path.resolve(process.cwd(), 'frontend', 'src', 'app', 'data');
const dbPath = path.join(dataDir, 'drafts.db');

// Ensure the data directory exists
fs.mkdirSync(dataDir, { recursive: true });

// Create the database instance
const db = new Database(dbPath);

// Create the drafts table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter TEXT NOT NULL,
    content TEXT,
    image_cids TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// GET /api/drafts?reporter=<address> - Get all drafts for a reporter
// GET /api/drafts?id=<id> - Get a single draft by id
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');
  const reporter = searchParams.get('reporter');

  if (id) {
    const draft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id);
    if (draft) {
      return NextResponse.json(draft);
    } else {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
  }

  if (reporter) {
    const drafts = db.prepare('SELECT * FROM drafts WHERE reporter = ? ORDER BY updated_at DESC').all(reporter);
    return NextResponse.json(drafts);
  }

  return NextResponse.json({ error: 'Missing reporter or id query parameter' }, { status: 400 });
}

// POST /api/drafts - Create a new draft
export async function POST(req: NextRequest) {
  const { reporter, content, image_cids } = await req.json();

  if (!reporter) {
    return NextResponse.json({ error: 'Reporter address is required' }, { status: 400 });
  }

  const imageCidsJson = JSON.stringify(image_cids || []);

  try {
    const stmt = db.prepare('INSERT INTO drafts (reporter, content, image_cids) VALUES (?, ?, ?)');
    const info = stmt.run(reporter, content, imageCidsJson);

    const newDraft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(info.lastInsertRowid);

    return NextResponse.json(newDraft, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}

// PUT /api/drafts - Update a draft
export async function PUT(req: NextRequest) {
  const { id, reporter, content, image_cids } = await req.json();

  if (!id || !reporter) {
    return NextResponse.json({ error: 'ID and reporter address are required' }, { status: 400 });
  }

  // Check if draft exists and belongs to the reporter
  const draft = db.prepare('SELECT * FROM drafts WHERE id = ? AND reporter = ?').get(id, reporter);
  if (!draft) {
    return NextResponse.json({ error: 'Draft not found or you do not have permission to edit it' }, { status: 404 });
  }

  const imageCidsJson = JSON.stringify(image_cids || []);

  try {
    const stmt = db.prepare('UPDATE drafts SET content = ?, image_cids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(content, imageCidsJson, id);

    const updatedDraft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id);
    return NextResponse.json(updatedDraft);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

// DELETE /api/drafts - Delete a draft
export async function DELETE(req: NextRequest) {
  const { id, reporter } = await req.json();

  if (!id || !reporter) {
    return NextResponse.json({ error: 'ID and reporter address are required' }, { status: 400 });
  }

  // Check if draft exists and belongs to the reporter
  const draft = db.prepare('SELECT * FROM drafts WHERE id = ? AND reporter = ?').get(id, reporter);
  if (!draft) {
    return NextResponse.json({ error: 'Draft not found or you do not have permission to delete it' }, { status: 404 });
  }

  try {
    const stmt = db.prepare('DELETE FROM drafts WHERE id = ?');
    stmt.run(id);
    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
