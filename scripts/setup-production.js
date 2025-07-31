const fs = require("fs")
const path = require("path")
const os = require("os")

// Get network interfaces
const getNetworkInterfaces = () => {
  const networkInterfaces = os.networkInterfaces()
  const addresses = []

  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address)
      }
    }
  }

  return addresses
}

// Create production configuration files
const setupProduction = () => {
  console.log("🚀 Setting up production configuration...")

  // Get IP addresses
  const addresses = getNetworkInterfaces()
  const primaryAddress = addresses.length > 0 ? addresses[0] : "localhost"

  // Create .env.production file
  const envContent = `# Production environment variables
NODE_ENV=production
PORT=5000
REDIS_URL=redis://localhost:6379

# Client configuration
NEXT_PUBLIC_SERVER_HOST=${primaryAddress}
NEXT_PUBLIC_SERVER_PORT=5000
`

  fs.writeFileSync(path.join(process.cwd(), ".env.production"), envContent)
  console.log("✅ Created .env.production file")

  // Create ecosystem.config.js for PM2
  const pm2Config = `module.exports = {
  apps: [
    {
      name: "chat-server",
      script: "server/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        REDIS_URL: "redis://localhost:6379"
      }
    },
    {
      name: "chat-client",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
}
`

  fs.writeFileSync(path.join(process.cwd(), "ecosystem.config.js"), pm2Config)
  console.log("✅ Created PM2 ecosystem.config.js file")

  // Create production README
  const readmeContent = `# Production Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Redis server installed and running
- PM2 installed globally (\`npm install -g pm2\`)

## Setup Instructions

1. **Build the application:**

\`\`\`bash
npm run build
\`\`\`

2. **Start the application with PM2:**

\`\`\`bash
pm2 start ecosystem.config.js
\`\`\`

3. **Monitor the application:**

\`\`\`bash
pm2 status
pm2 logs
\`\`\`

4. **Access the application:**

- Server: http://${primaryAddress}:5000
- Client: http://${primaryAddress}:3000

## Environment Variables

The application uses the following environment variables:

- \`PORT\`: The port for the server (default: 5000)
- \`REDIS_URL\`: The Redis connection URL (default: redis://localhost:6379)
- \`NEXT_PUBLIC_SERVER_HOST\`: The server hostname (default: ${primaryAddress})
- \`NEXT_PUBLIC_SERVER_PORT\`: The server port (default: 5000)

## Troubleshooting

1. **Redis connection issues:**
   - Check if Redis is running: \`redis-cli ping\`
   - Verify Redis connection URL in .env.production

2. **Network connectivity issues:**
   - Check firewall settings for ports 3000 and 5000
   - Verify all devices are on the same network

3. **PM2 issues:**
   - Restart PM2: \`pm2 restart all\`
   - Check logs: \`pm2 logs\`

## Scaling

To scale the application:

1. **Horizontal scaling:**
   - Modify ecosystem.config.js to increase instances
   - Use a Redis cluster for message persistence

2. **Load balancing:**
   - Set up Nginx as a reverse proxy
   - Configure sticky sessions for WebSocket connections
`

  fs.writeFileSync(path.join(process.cwd(), "PRODUCTION.md"), readmeContent)
  console.log("✅ Created PRODUCTION.md guide")

  console.log("\n🎉 Production setup complete!")
  console.log(`\nYour server IP address: ${primaryAddress}`)
  console.log("\nNext steps:")
  console.log("1. Build the application: npm run build")
  console.log("2. Start in production: npm run start:prod")
  console.log("3. Or use PM2: pm2 start ecosystem.config.js")
}

setupProduction()
