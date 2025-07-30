# Private Chat Application

A real-time private messaging application built with Node.js, Socket.IO, Redis, and Next.js.

## Features

- Real-time private messaging between users
- Message persistence with Redis
- User presence indicators (online/offline)
- Typing indicators
- Message history for each conversation
- Notifications for new messages
- Automatic reconnection
- Production-ready configuration
- Cross-device compatibility

## Prerequisites

- Node.js 18+
- Redis server
- npm or yarn

## Quick Start

### 1. Install Redis

**macOS (using Homebrew):**
\`\`\`bash
brew install redis
brew services start redis
\`\`\`

**Ubuntu/Debian:**
\`\`\`bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
\`\`\`

**Windows:**
Download and install Redis from the official website or use WSL.

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Start Redis Server

Make sure Redis is running on localhost:6379 (default port).

### 4. Run the Application (Development)

**Terminal 1 - Start the backend server:**
\`\`\`bash
npm run server
\`\`\`

**Terminal 2 - Start the Next.js frontend:**
\`\`\`bash
npm run dev
\`\`\`

### 5. Access the Application

Open your browser and go to `http://localhost:3000`

## Production Deployment

For production deployment across different devices, follow these steps:

### 1. Setup Production Configuration

\`\`\`bash
npm run setup:prod
\`\`\`

This will create necessary configuration files with your network information.

### 2. Build the Application

\`\`\`bash
npm run build
\`\`\`

### 3. Start in Production Mode

\`\`\`bash
npm run start:all
\`\`\`

Or if you have PM2 installed:

\`\`\`bash
pm2 start ecosystem.config.js
\`\`\`

### 4. Access from Different Devices

- Server device: `http://localhost:3000`
- Other devices: `http://YOUR_SERVER_IP:3000`

For detailed production deployment instructions, see [PRODUCTION.md](./PRODUCTION.md).

## Project Structure

\`\`\`
├── server/
│   └── index.js          # Node.js server with Socket.IO and Redis
├── app/
│   └── page.tsx          # Next.js home page
├── components/
│   └── private-chat.tsx  # Chat component
├── lib/
│   └── config.ts         # Configuration utilities
├── scripts/
│   ├── setup-redis.js    # Redis setup script
│   └── setup-production.js # Production configuration script
└── package.json
\`\`\`

## Technologies Used

- **Backend:** Node.js, Express, Socket.IO, Redis
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui
- **Real-time:** WebSocket connections via Socket.IO
- **Storage:** Redis for message persistence
- **Deployment:** PM2 for process management

## License

MIT
\`\`\`
