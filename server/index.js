const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const redis = require("redis")
const cors = require("cors")
const os = require("os")

// Environment variables with fallbacks
const PORT = process.env.PORT || 5000
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const NODE_ENV = process.env.NODE_ENV || "development"

const app = express()
const server = http.createServer(app)

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins in production
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000, // Increase timeout for better reliability
  pingInterval: 25000, // More frequent pings to detect disconnections
})

// Redis client setup with better error handling
const redisClient = redis.createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff with max 10 seconds
      const delay = Math.min(Math.pow(2, retries) * 1000, 10000)
      console.log(`Redis reconnecting in ${delay}ms...`)
      return delay
    },
  },
})

// Redis error handling
redisClient.on("error", (err) => {
  console.error("Redis client error:", err)
})

redisClient.on("connect", () => {
  console.log("Connected to Redis successfully")
})

redisClient.on("reconnecting", () => {
  console.log("Reconnecting to Redis...")
})

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error("Failed to connect to Redis:", err)
})

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins in production
    credentials: true,
  }),
)
app.use(express.json())

// Store active users and their socket IDs
const activeUsers = new Map() // username -> socketId
const userSockets = new Map() // socketId -> username

// Generate conversation ID for two users
const getConversationId = (user1, user2) => {
  return [user1, user2].sort().join(":")
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // Handle user login
  socket.on("login", async (username) => {
    try {
      // Store user info
      activeUsers.set(username, socket.id)
      userSockets.set(socket.id, username)

      console.log(`${username} logged in`)

      // Get list of all users except current user
      const allUsers = Array.from(activeUsers.keys()).filter((user) => user !== username)
      socket.emit("users_list", allUsers)

      // Notify other users that this user is online
      socket.broadcast.emit("user_online", username)
    } catch (error) {
      console.error("Error in login handler:", error)
      socket.emit("error", { message: "Failed to login" })
    }
  })

  // Handle starting a conversation
  socket.on("start_conversation", async (targetUser) => {
    try {
      const currentUser = userSockets.get(socket.id)
      if (!currentUser) return

      const conversationId = getConversationId(currentUser, targetUser)

      // Get previous messages from Redis
      const messages = await redisClient.lRange(`conversation:${conversationId}`, -50, -1)
      const parsedMessages = messages.map((msg) => JSON.parse(msg))

      socket.emit("conversation_started", {
        conversationId,
        targetUser,
        messages: parsedMessages,
      })
    } catch (error) {
      console.error("Error fetching conversation:", error)
      socket.emit("error", { message: "Failed to start conversation" })
    }
  })

  // Handle sending private messages
  socket.on("send_private_message", async (messageData) => {
    try {
      const sender = userSockets.get(socket.id)
      if (!sender) return

      const { targetUser, message } = messageData
      const conversationId = getConversationId(sender, targetUser)

      const messageObj = {
        id: Date.now().toString(),
        sender,
        targetUser,
        message,
        conversationId,
        timestamp: new Date().toISOString(),
      }

      // Store message in Redis
      await redisClient.lPush(`conversation:${conversationId}`, JSON.stringify(messageObj))

      // Keep only last 100 messages
      await redisClient.lTrim(`conversation:${conversationId}`, -100, -1)

      // Send message to sender
      socket.emit("receive_private_message", messageObj)

      // Send message to target user if online
      const targetSocketId = activeUsers.get(targetUser)
      if (targetSocketId) {
        io.to(targetSocketId).emit("receive_private_message", messageObj)
      }
    } catch (error) {
      console.error("Error storing message:", error)
      socket.emit("error", { message: "Failed to send message" })
    }
  })

  // Handle typing indicators
  socket.on("typing", (targetUser) => {
    try {
      const sender = userSockets.get(socket.id)
      if (!sender) return

      const targetSocketId = activeUsers.get(targetUser)
      if (targetSocketId) {
        io.to(targetSocketId).emit("user_typing", sender)
      }
    } catch (error) {
      console.error("Error in typing handler:", error)
    }
  })

  socket.on("stop_typing", (targetUser) => {
    try {
      const sender = userSockets.get(socket.id)
      if (!sender) return

      const targetSocketId = activeUsers.get(targetUser)
      if (targetSocketId) {
        io.to(targetSocketId).emit("user_stop_typing", sender)
      }
    } catch (error) {
      console.error("Error in stop_typing handler:", error)
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    try {
      const username = userSockets.get(socket.id)
      if (username) {
        // Remove user from active users
        activeUsers.delete(username)
        userSockets.delete(socket.id)

        // Notify other users that this user is offline
        socket.broadcast.emit("user_offline", username)

        console.log(`${username} disconnected`)
      }
    } catch (error) {
      console.error("Error in disconnect handler:", error)
    }
  })
})

// API Routes
app.get("/", (req, res) => {
  res.send("Chat Server is running")
})

app.get("/api/health", (req, res) => {
  const redisStatus = redisClient.isOpen ? "connected" : "disconnected"
  res.json({
    status: "OK",
    environment: NODE_ENV,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  })
})

app.get("/api/server-info", (req, res) => {
  const networkInterfaces = os.networkInterfaces()
  const addresses = []

  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address)
      }
    }
  }

  res.json({
    addresses,
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`)
  console.log(`Local URL: http://localhost:${PORT}`)

  // Log all available network interfaces
  const networkInterfaces = os.networkInterfaces()
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        console.log(`Network URL: http://${net.address}:${PORT}`)
      }
    }
  }
})
