# Stage 1: Build React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory (for when secrets are mounted)
RUN mkdir -p /etc/nginx/ssl && \
    chmod 700 /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]