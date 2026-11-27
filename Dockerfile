# ---------- ① ビルド用の段階：TypeScript を JavaScript に変換する ----------
FROM public.ecr.aws/docker/library/node:24-alpine AS build
WORKDIR /app

# 先に部品の一覧だけコピーしてインストール（コードを変えても、ここは使い回される）
COPY package.json package-lock.json ./
RUN npm ci

# コードをコピーしてビルド
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- ② 実行用の段階：動かすのに必要なものだけを入れる ----------
FROM public.ecr.aws/docker/library/node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

# 本番で使う部品だけを入れる（typescript や vitest などの開発用は入れない）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ビルドした結果と、テーブルの設計図だけをコピー
COPY --from=build /app/dist ./dist
COPY db ./db

# 管理者（root）ではなく、権限の少ない node ユーザーで動かす
USER node

EXPOSE 3100
CMD ["node", "dist/index.js"]
