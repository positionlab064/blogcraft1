# ── Build Stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

# better-sqlite3 네이티브 모듈 빌드 도구
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/server/ ./server/
COPY backend/tsconfig.json ./

# TypeScript → JavaScript 컴파일
RUN npx tsc -p tsconfig.json

# ── Production Stage ──────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# 빌드된 JS 복사
COPY --from=builder /app/dist-server ./dist-server/

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist-server/index.js"]
