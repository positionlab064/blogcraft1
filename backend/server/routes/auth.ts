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
  nickname: string | null;
  phone: string | null;
  password_hash: string;
  created_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, nickname, username, phone } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    nickname?: string;
    username?: string;
    phone?: string;
  };

  if (!name?.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }
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

  try {
    const normalEmail = email.toLowerCase().trim();
    const normalUsername = username.trim().toLowerCase();
    const normalPhone = phone?.trim() || null;
    const db = getDb();

    const existingEmail = await db.query('SELECT id FROM users WHERE email = $1', [normalEmail]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    const existingUsername = await db.query('SELECT id FROM users WHERE username = $1', [normalUsername]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
    }

    if (normalPhone) {
      const existingPhone = await db.query('SELECT id FROM users WHERE phone = $1', [normalPhone]);
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({ error: '이미 가입된 전화번호입니다.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (email, username, password_hash, name, nickname, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [normalEmail, normalUsername, passwordHash, name.trim(), nickname?.trim() || null, normalPhone],
    );

    const userId = result.rows[0].id;
    const token = signToken(userId, normalEmail);
    return res.status(201).json({
      token,
      user: {
        id: userId,
        email: normalEmail,
        username: normalUsername,
        name: name.trim(),
        nickname: nickname?.trim() || null,
        phone: normalPhone,
      },
    });
  } catch (err) {
    console.error('[auth] register error:', err);
    return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    const user = result.rows[0] as UserRow | undefined;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    return res.json({
      token: signToken(user.id, user.email),
      user: { id: user.id, email: user.email, username: user.username, name: user.name, nickname: user.nickname, phone: user.phone },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = await db.query(
    'SELECT id, email, username, name, nickname, phone, created_at FROM users WHERE id = $1',
    [req.userId],
  );
  const user = result.rows[0] as Omit<UserRow, 'password_hash'> | undefined;

  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  return res.json(user);
});

export default router;
