# Use Node.js official image
FROM node:18-alpine

# Install build dependencies for native modules like better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Set working directory
WORKDIR /app

# Copy root package files first
COPY package*.json ./

# Install all dependencies from root (skip for now since we're using backend deps)
# RUN npm ci --omit=dev

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies with build tools available
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy memory directory structure
COPY memory/ /app/memory/

# Create necessary directories and set permissions
RUN mkdir -p /app/memory/database && \
    chmod 755 /app/memory/database

# Set environment variables
ENV USE_SQLITE=true
ENV NODE_ENV=production
ENV SQLITE_PATH=/app/memory/database/superkraft.db

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "start"]