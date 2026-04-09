# ---- Base Stage ----
FROM node:20-slim AS base

# Install Playwright system dependencies (Chromium)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Dependencies Stage ----
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

# Install only Chromium browser for Playwright
RUN npx playwright install chromium

# ---- Build Stage ----
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.cache /root/.cache
COPY . .

# Build Next.js production bundle
RUN npm run build

# ---- Production Stage ----
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built assets and dependencies
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy Playwright browser binaries
COPY --from=deps /root/.cache /root/.cache

EXPOSE 3000

CMD ["npm", "start"]
