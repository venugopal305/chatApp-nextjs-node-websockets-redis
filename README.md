# Private Chat Application

A real-time private messaging application built with Node.js, Socket.IO, Redis, and Next.js.

## Features

- Real-time private messaging between two users
- Message persistence with Redis
- User presence indicators (online/offline)
- Typing indicators
- Message history for each conversation
- Clean and responsive UI
- Avatar support with user initials

## How It Works

1. **Login**: Users enter their username to join the chat
2. **User List**: See all online users in the sidebar
3. **Start Conversation**: Click on any user to start a private conversation
4. **Real-time Messaging**: Send and receive messages instantly
5. **Message History**: Previous conversations are automatically loaded
6. **Typing Indicators**: See when the other person is typing

## Prerequisites

- Node.js 18+
- Redis server
- npm or yarn

## Setup Instructions

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

### 4. Run the Application

**Terminal 1 - Start the backend server:**
\`\`\`bash
npm run server
\`\`\`

**Terminal 2 - Start the Next.js frontend:**
\`\`\`bash
npm run dev
\`\`\`

### 5. Access the Application

1. Open your browser and go to `http://localhost:3000`
2. Enter a username and click "Start Chatting"
3. Open another browser tab/window with a different username
4. Click on users in the sidebar to start private conversations

## Project Structure

\`\`\`bash
├── server/
│   └── index.js          # Node.js server with Socket.IO and Redis
├── app/
│   └── page.tsx          # Next.js home page
├── components/
│   └── chat-room.tsx     # Chat room component
├── scripts/
│   └── setup-redis.js    # Redis setup script
└── package.json
\`\`\`

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/conversation/:user1/:user2` - Get conversation history between two users

## Socket Events

### Client to Server
- `login` - User login with username
- `start_conversation` - Start conversation with target user
- `send_private_message` - Send private message
- `typing` - Indicate user is typing
- `stop_typing` - Stop typing indicator

### Server to Client
- `users_list` - List of online users
- `user_online` - User came online
- `user_offline` - User went offline
- `conversation_started` - Conversation initiated with message history
- `receive_private_message` - Receive new private message
- `user_typing` - Typing indicator
- `user_stop_typing` - Stop typing indicator

## Technologies Used

- **Backend:** Node.js, Express, Socket.IO, Redis
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui
- **Real-time:** WebSocket connections via Socket.IO
- **Storage:** Redis for message persistence
