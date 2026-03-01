import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { JWT_SECRET, requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface UserRow {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  phone: string | null;
  password_hash: string;
  created_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId: number | bigint, email: string): string {
  return jwt.sign({ userId: Number(userId), email }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, username, phone } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    username?: string;
    phone?: string;
  };

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
  }
  if (!username?.trim()) {
    return res.status(400).json({ error: '아이디를 입력해주세요.' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
    return res.status(400).json({ error: '아이디는 영문, 숫자, 밑줄(_)만 사용 가능하며 3~20자여야 합니다.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const normalEmail = email.toLowerCase().trim();
  const normalUsername = username.trim().toLowerCase();
  const db = getDb();

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalEmail);
  if (existingEmail) {
    return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
  }

  const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(normalUsername);
  if (existingUsername) {
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db
    .prepare('INSERT INTO users (email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?)')
    .run(normalEmail, normalUsername, passwordHash, name?.trim() || null, phone?.trim() || null);

  const token = signToken(result.lastInsertRowid, normalEmail);
  return res.status(201).json({
    token,
    user: {
      id: Number(result.lastInsertRowid),
      email: normalEmail,
      username: normalUsername,
      name: name?.trim() || null,
      phone: phone?.trim() || null,
    },
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username.toLowerCase().trim()) as UserRow | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  return res.json({
    token: signToken(user.id, user.email),
    user: { id: user.id, email: user.email, username: user.username, name: user.name, phone: user.phone },
  });
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db
    .prepare('SELECT id, email, username, name, phone, created_at FROM users WHERE id = ?')
    .get(req.userId) as Omit<UserRow, 'password_hash'> | undefined;

  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  return res.json(user);
});

export default router;
