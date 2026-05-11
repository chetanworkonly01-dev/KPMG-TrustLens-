FROM node:20-slim

# Install system dependencies required by Playwright Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (Docker layer caching)
COPY package.json package-lock.json ./

# Install NPM dependencies
RUN npm ci

# Install Playwright Chromium + system deps
RUN npx playwright install --with-deps chromium

# Copy source code
COPY . .

# Build Next.js (standalone mode)
RUN npm run build

# --- Production setup ---
# The standalone build outputs to .next/standalone
# We need to copy the public and static files into it

RUN cp -r public .next/standalone/public 2>/dev/null || true
RUN cp -r .next/static .next/standalone/.next/static

# Railway sets PORT dynamically, Next.js standalone server reads it
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Run the standalone server (much lighter than `next start`)
CMD ["node", ".next/standalone/server.js"]
