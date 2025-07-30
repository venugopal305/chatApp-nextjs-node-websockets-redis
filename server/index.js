const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const redis = require("redis")
const cors = require("cors")

const app = express()
const server = http.createServer(app)

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Redis client setup
const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
})

redisClient.connect().catch(console.error)

// Middleware
app.use(cors())
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
    // Store user info
    activeUsers.set(username, socket.id)
    userSockets.set(socket.id, username)

    console.log(`${username} logged in`)

    // Get list of all users except current user
    const allUsers = Array.from(activeUsers.keys()).filter((user) => user !== username)
    socket.emit("users_list", allUsers)

    // Notify other users that this user is online
    socket.broadcast.emit("user_online", username)
  })

  // Handle starting a conversation
  socket.on("start_conversation", async (targetUser) => {
    const currentUser = userSockets.get(socket.id)
    if (!currentUser) return

    const conversationId = getConversationId(currentUser, targetUser)

    try {
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
    }
  })

  // Handle sending private messages
  socket.on("send_private_message", async (messageData) => {
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

    try {
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
    }
  })

  // Handle typing indicators
  socket.on("typing", (targetUser) => {
    const sender = userSockets.get(socket.id)
    if (!sender) return

    const targetSocketId = activeUsers.get(targetUser)
    if (targetSocketId) {
      io.to(targetSocketId).emit("user_typing", sender)
    }
  })

  socket.on("stop_typing", (targetUser) => {
    const sender = userSockets.get(socket.id)
    if (!sender) return

    const targetSocketId = activeUsers.get(targetUser)
    if (targetSocketId) {
      io.to(targetSocketId).emit("user_stop_typing", sender)
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    const username = userSockets.get(socket.id)
    if (username) {
      // Remove user from active users
      activeUsers.delete(username)
      userSockets.delete(socket.id)

      // Notify other users that this user is offline
      socket.broadcast.emit("user_offline", username)

      console.log(`${username} disconnected`)
    }
  })
})

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

app.get("/api/conversation/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params
    const conversationId = getConversationId(user1, user2)
    const messages = await redisClient.lRange(`conversation:${conversationId}`, -50, -1)
    const parsedMessages = messages.map((msg) => JSON.parse(msg))
    res.json(parsedMessages)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversation" })
  }
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
