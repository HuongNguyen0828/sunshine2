# Dependencies stage
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared module
COPY shared/ ../shared/

# Copy package files
COPY web-admin/package*.json ./
RUN npm ci

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared module
COPY shared/ ../shared/

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY web-admin/package*.json ./

# Copy web-admin source code
COPY web-admin/ ./

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy shared module
COPY shared/ ../shared/

# Copy package files and install only production dependencies
COPY web-admin/package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]