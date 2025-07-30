# Production Deployment Guide

This guide will help you deploy the chat application in a production environment so it works reliably across different devices.

## Prerequisites

- Node.js 18+ installed
- Redis server installed and running
- PM2 (optional, for process management)

## Deployment Options

### Option 1: Same Network Deployment (Home/Office)

This is the simplest setup where all devices are on the same local network.

1. **Find your server's IP address:**

\`\`\`bash
# Run the setup script
npm run setup:prod
\`\`\`

This will create configuration files with your local IP address.

2. **Build the application:**

\`\`\`bash
npm run build
\`\`\`

3. **Start the application:**

\`\`\`bash
# Start both server and client
npm run start:all

# Or use PM2 if installed
pm2 start ecosystem.config.js
\`\`\`

4. **Access from different devices:**
   - Server device: `http://localhost:3000`
   - Other devices: `http://YOUR_SERVER_IP:3000`

### Option 2: Cloud Deployment

For deploying to cloud services like AWS, DigitalOcean, or Heroku:

1. **Set up a Redis instance:**
   - Use a managed Redis service (Redis Labs, AWS ElastiCache, etc.)
   - Or install Redis on your server

2. **Configure environment variables:**

\`\`\`
NODE_ENV=production
PORT=5000
REDIS_URL=redis://your-redis-url:6379
NEXT_PUBLIC_SERVER_HOST=your-domain.com
NEXT_PUBLIC_SERVER_PORT=5000
\`\`\`

3. **Build and deploy:**

\`\`\`bash
npm run build
npm run start:prod
\`\`\`

4. **Set up a reverse proxy (Nginx):**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
