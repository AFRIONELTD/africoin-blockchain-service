# Build a lightweight production image for africoin-service
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Set env to production inside container
ENV NODE_ENV=production

# Install dependencies (use npm ci for clean, reproducible installs)
COPY package*.json ./
# Use npm install to tolerate lockfile drift; consider switching back to `npm ci` after updating package-lock.json
RUN npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Expose HTTP port
EXPOSE 3000

# Start the service
CMD ["node", "src/index.js"]
