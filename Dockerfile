# ── Stage 1: Build ─────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# install dependencies first (better layer caching)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# copy source
COPY . .

# generate prisma client
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
RUN npx prisma generate

# build
RUN npm run build

# ── Stage 2: Production ────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

# install puppeteer dependencies (for PDF generation)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# tell puppeteer to use installed chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nestjs -u 1001

# copy package files
COPY package.json yarn.lock ./

# install production only
RUN yarn install --production --frozen-lockfile

# copy built files from builder
COPY --from=builder /app/dist ./dist

# copy prisma schema for migrations
COPY prisma ./prisma

COPY prisma.config.ts ./

# switch to non-root user
USER nestjs

EXPOSE 3002

# run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
