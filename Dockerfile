# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm i

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY src ./src

# Build the application - using direct tsc command
RUN npx tsc && npx tsc-alias

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm i  && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy swagger-docs folder
# COPY swagger-docs ./swagger-docs

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Change to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "dist/server.js"]