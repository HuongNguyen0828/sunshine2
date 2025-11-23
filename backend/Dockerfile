# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared module first
COPY shared/ ./shared/

# Copy backend package files
COPY backend/package*.json ./backend/

# Install all dependencies (including dev dependencies for build)
WORKDIR /app/backend
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build the application
RUN npm run build:docker

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy shared module
COPY shared/ ./shared/

# Copy backend package files
COPY backend/package*.json ./backend/

# Install only production dependencies
WORKDIR /app/backend
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

EXPOSE 5001

CMD ["npm", "start"]