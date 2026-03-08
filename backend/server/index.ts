import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import generateRouter from './routes/generate.js';
import photosRouter from './routes/photos.js';
import seoRouter from './routes/seo.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

const app = express();

// ── 미들웨어 ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 요청 로깅
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── API 라우터 ──────────────────────────────────────────────
app.use('/api/auth', authRouter);                         // 공개
app.use('/api/generate', requireAuth, generateRouter);   // 인증 필요
app.use('/api/photos', requireAuth, photosRouter);       // 인증 필요
app.use('/api/seo', requireAuth, seoRouter);             // 인증 필요

// 헬스 체크
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 프로덕션: 정적 파일 서빙 ──────────────────────────────
if (!isDev) {
  const distPath = path.join(__dirname, '..', '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── 에러 핸들러 ────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// ── 시작 ───────────────────────────────────────────────────
initDb().catch(err => {
  console.error('[DB] Failed to initialize database:', err);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 BlogCraft AI 서버 실행 중`);
  console.log(`   API:  http://localhost:${PORT}/api`);
  console.log(`   환경: ${isDev ? 'development' : 'production'}\n`);
});

export default app;
