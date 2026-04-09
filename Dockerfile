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

# Copy package files first (for Docker layer caching)
COPY package.json package-lock.json ./

# Install all NPM dependencies
RUN npm ci

# Install Playwright Chromium browser + its system dependencies
RUN npx playwright install --with-deps chromium

# Copy the rest of the source code
COPY . .

# Build the Next.js production bundle
RUN npm run build

# Expose port
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]
