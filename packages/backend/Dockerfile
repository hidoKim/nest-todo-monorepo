# syntax=docker/dockerfile:1
# 빌드 컨텍스트는 "리포 루트"를 가정한다 (npm workspaces라 root lock 파일이 필요).
#   docker build -f packages/backend/Dockerfile -t backend .

# ---- 1) Builder: 의존성 설치 + 빌드 ----
FROM node:20-slim AS builder
WORKDIR /app

# sqlite3 같은 네이티브 모듈 빌드 대비 (prebuilt 없을 때만 사용됨)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# 매니페스트만 먼저 복사 → 소스가 바뀌어도 install 레이어 캐시 재사용
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json

# 백엔드 tsconfig가 상속하는 루트 tsconfig (esModuleInterop 등). 없으면 빌드 깨짐.
COPY tsconfig.json ./

# lock 기준 전체 workspace 의존성 설치
RUN npm ci

# 백엔드 소스 복사 후 빌드 (dist 생성)
COPY packages/backend ./packages/backend
RUN npm -w packages/backend run build

# devDependencies 제거 → 런타임 의존성만 남김
RUN npm prune --omit=dev

# ---- 2) Runner: 실행 전용 경량 이미지 ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# 빌드 산출물 + 정리된 node_modules만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json

# Render는 PORT를 주입한다. main.ts가 process.env.PORT를 읽음.
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
