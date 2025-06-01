# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install production dependencies only
WORKDIR /app/backend
RUN npm ci --omit=dev

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