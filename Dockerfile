# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy root package files first
COPY package*.json ./

# Install all dependencies from root
RUN npm ci --omit=dev

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy memory directory structure
COPY memory/ /app/memory/

# Create necessary directories
RUN mkdir -p /app/memory/database

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "start"]