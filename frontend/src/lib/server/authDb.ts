import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";

type Role = "CIT" | "GOV";

type UserRow = {
  id: number;
  name: string;
  cccd_hash: string;
  wallet_address: string;
  role: Role;
  is_active: number;
  password_hash: string;
  password_salt: string;
};

export type SafeUser = {
  id: number;
  name: string;
  role: Role;
  identifier: string;
  walletAddress: string;
  isActive: boolean;
};

type RegisterInput = {
  name: string;
  cccd: string;
  phone: string;
  address: string;
  password: string;
  deposit: number;
};

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_WALLET = "0x4570FDbd50e25C1E80836e73099b4f7BFABDEbd6";

function resolveDataDir(): string {
  const cwd = process.cwd();
  if (path.basename(cwd) === "frontend") {
    return path.join(cwd, "src", "app", "data");
  }
  return path.join(cwd, "frontend", "src", "app", "data");
}

const dataDir = resolveDataDir();
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "auth.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cccd TEXT NOT NULL UNIQUE,
    cccd_hash TEXT NOT NULL UNIQUE,
    cccd_salt TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    wallet_address TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'CIT',
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_users_hash ON users(cccd_hash);
`);

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateWalletAddress(): string {
  return `0x${crypto.randomBytes(20).toString("hex")}`;
}

function toSafeUser(user: UserRow): SafeUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    identifier: user.cccd_hash,
    walletAddress: user.wallet_address,
    isActive: Boolean(user.is_active),
  };
}

function seedAdminUser() {
  const existing = db
    .prepare("SELECT id FROM users WHERE wallet_address = ? LIMIT 1")
    .get(ADMIN_WALLET) as { id: number } | undefined;

  if (existing) return;

  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword("Admin123", passwordSalt);
  const cccdSalt = crypto.randomBytes(16).toString("hex");
  const cccdHash = sha256(`ADMIN_SEED_${cccdSalt}`);

  db.prepare(
    `INSERT INTO users (
      name, cccd, cccd_hash, cccd_salt, phone, address, password_hash, password_salt, wallet_address, role, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "System Admin",
    "ADMIN_SEED",
    cccdHash,
    cccdSalt,
    "",
    "",
    passwordHash,
    passwordSalt,
    ADMIN_WALLET,
    "GOV",
    1
  );
}

seedAdminUser();

export function registerCitizen(input: RegisterInput): SafeUser {
  const cccdSalt = crypto.randomBytes(16).toString("hex");
  const cccdHash = sha256(`${input.cccd}:${cccdSalt}`);
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(input.password, passwordSalt);
  const walletAddress = generateWalletAddress();

  const insert = db.transaction(() => {
    const existingCccd = db
      .prepare("SELECT id FROM users WHERE cccd = ? LIMIT 1")
      .get(input.cccd) as { id: number } | undefined;

    if (existingCccd) {
      throw new Error("CCCD đã được đăng ký.");
    }

    const info = db
      .prepare(
        `INSERT INTO users (
          name, cccd, cccd_hash, cccd_salt, phone, address, password_hash, password_salt, wallet_address, role, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.name.trim(),
        input.cccd,
        cccdHash,
        cccdSalt,
        input.phone.trim(),
        input.address.trim(),
        passwordHash,
        passwordSalt,
        walletAddress,
        "CIT",
        input.deposit > 0 ? 1 : 0
      );

    return info.lastInsertRowid as number;
  });

  const userId = insert();
  const user = db
    .prepare(
      "SELECT id, name, cccd_hash, wallet_address, role, is_active, password_hash, password_salt FROM users WHERE id = ?"
    )
    .get(userId) as UserRow;

  return toSafeUser(user);
}

export function loginWithIdentifier(
  identifier: string,
  password: string
): SafeUser | null {
  const user = db
    .prepare(
      `SELECT id, name, cccd_hash, wallet_address, role, is_active, password_hash, password_salt
       FROM users
       WHERE cccd_hash = ? OR wallet_address = ?
       LIMIT 1`
    )
    .get(identifier, identifier) as UserRow | undefined;

  if (!user) {
    return null;
  }

  const incomingPasswordHash = hashPassword(password, user.password_salt);
  if (incomingPasswordHash !== user.password_hash) {
    return null;
  }

  return toSafeUser(user);
}

export function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(
    new Date().toISOString()
  );
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(tokenHash, userId, expiresAt);

  return { token, expiresAt };
}

export function getUserBySessionToken(token: string): SafeUser | null {
  const tokenHash = sha256(token);
  const user = db
    .prepare(
      `SELECT u.id, u.name, u.cccd_hash, u.wallet_address, u.role, u.is_active, u.password_hash, u.password_salt
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?
       LIMIT 1`
    )
    .get(tokenHash, new Date().toISOString()) as UserRow | undefined;

  if (!user) {
    return null;
  }

  return toSafeUser(user);
}
