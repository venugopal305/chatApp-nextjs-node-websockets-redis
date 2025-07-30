"use client"

import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Users, LogOut, MessageCircle, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { getServerConfig } from "@/lib/config"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Message {
  id: string
  sender: string
  targetUser: string
  message: string
  timestamp: string
  conversationId: string
}

interface PrivateChatProps {
  username: string
}

export default function PrivateChat({ username }: PrivateChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [users, setUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Get server configuration
    const { serverUrl } = getServerConfig()
    console.log("Connecting to server:", serverUrl)

    // Initialize socket connection with reconnection options
    const newSocket = io(serverUrl, {
      transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    // Connection events
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id)
      setIsConnected(true)
      setConnectionError(null)
      setReconnecting(false)

      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      // Login with username
      newSocket.emit("login", username)

      toast({
        title: "Connected to chat server",
        description: "You are now online",
      })
    })

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err.message)
      setConnectionError(`Connection error: ${err.message}`)
      setIsConnected(false)

      // Try to reconnect manually after socket.io gives up
      if (!reconnecting) {
        setReconnecting(true)
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting manual reconnection...")
          newSocket.connect()
        }, 5000)
      }
    })

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)
      setIsConnected(false)

      if (reason === "io server disconnect") {
        // Server disconnected us, try to reconnect manually
        setReconnecting(true)
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting manual reconnection after server disconnect...")
          newSocket.connect()
        }, 5000)
      }

      toast({
        variant: "destructive",
        title: "Disconnected from server",
        description: "Attempting to reconnect...",
      })
    })

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}...`)
      setReconnecting(true)
    })

    newSocket.on("reconnect", () => {
      console.log("Reconnected to server")
      setReconnecting(false)

      // Re-login after reconnection
      newSocket.emit("login", username)

      toast({
        title: "Reconnected to chat server",
        description: "You are back online",
      })
    })

    newSocket.on("error", (error) => {
      console.error("Socket error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unknown error occurred",
      })
    })

    // Chat events
    newSocket.on("users_list", (userList: string[]) => {
      setUsers(userList)
    })

    newSocket.on("user_online", (user: string) => {
      setUsers((prev) => (prev.includes(user) ? prev : [...prev, user]))

      toast({
        title: "User online",
        description: `${user} is now online`,
      })
    })

    newSocket.on("user_offline", (user: string) => {
      setUsers((prev) => prev.filter((u) => u !== user))

      if (selectedUser === user) {
        toast({
          variant: "destructive",
          title: "User offline",
          description: `${user} has gone offline`,
        })
      }
    })

    newSocket.on("conversation_started", (data) => {
      setMessages(data.messages)
      setSelectedUser(data.targetUser)
    })

    newSocket.on("receive_private_message", (message: Message) => {
      // Only show messages for current conversation
      if (selectedUser && (message.sender === selectedUser || message.targetUser === selectedUser)) {
        setMessages((prev) => [...prev, message])

        // Notify if message is from the other user and window is not focused
        if (message.sender === selectedUser && document.visibilityState !== "visible") {
          // Browser notification if supported
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`New message from ${message.sender}`, {
              body: message.message,
            })
          }

          // Sound notification
          const audio = new Audio("/notification.mp3")
          audio.play().catch((err) => console.error("Failed to play notification sound:", err))
        }
      }
    })

    newSocket.on("user_typing", (user: string) => {
      if (user === selectedUser) {
        setTypingUser(user)
      }
    })

    newSocket.on("user_stop_typing", (user: string) => {
      if (user === selectedUser) {
        setTypingUser(null)
      }
    })

    setSocket(newSocket)

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      newSocket.close()
    }
  }, [username, toast])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const startConversation = (targetUser: string) => {
    if (socket && socket.connected) {
      socket.emit("start_conversation", targetUser)
      setMessages([]) // Clear previous messages
    } else {
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "You are not connected to the server",
      })
    }
  }

  const sendMessage = () => {
    if (newMessage.trim() && socket && socket.connected && selectedUser) {
      socket.emit("send_private_message", {
        targetUser: selectedUser,
        message: newMessage,
      })
      setNewMessage("")

      // Stop typing indicator
      socket.emit("stop_typing", selectedUser)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    } else if (!socket || !socket.connected) {
      toast({
        variant: "destructive",
        title: "Cannot send message",
        description: "You are not connected to the server",
      })
    }
  }

  const handleTyping = () => {
    if (socket && socket.connected && selectedUser) {
      socket.emit("typing", selectedUser)

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit("stop_typing", selectedUser)
        }
      }, 1000)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleLogout = () => {
    if (socket) {
      socket.disconnect()
    }
    window.location.reload()
  }

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const handleReconnect = () => {
    if (socket) {
      setReconnecting(true)
      socket.connect()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Connection status banner */}
      {!isConnected && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{reconnecting ? "Reconnecting to server..." : connectionError || "Disconnected from server"}</span>
            <Button variant="outline" size="sm" onClick={handleReconnect} disabled={reconnecting}>
              {reconnecting ? "Reconnecting..." : "Reconnect"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-2rem)]">
        {/* Users Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Users ({users.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">Logged in as: {username}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No other users online</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedUser === user ? "bg-blue-100 border border-blue-200" : "hover:bg-gray-100"
                    }`}
                    onClick={() => startConversation(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-500">Online</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          {selectedUser ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedUser)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{selectedUser}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                        {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                      {typingUser && <span className="text-xs text-gray-500">{typingUser} is typing...</span>}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === username ? "justify-end" : "justify-start"}`}
                        >
                          <div className="flex items-end gap-2 max-w-xs lg:max-w-md">
                            {message.sender !== username && (
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{getInitials(message.sender)}</AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`px-4 py-2 rounded-lg ${
                                message.sender === username
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-gray-200"
                              }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.sender === username ? "text-blue-100" : "text-gray-500"
                                }`}
                              >
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        handleTyping()
                      }}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder={`Message ${selectedUser}...`}
                      disabled={!isConnected}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || !isConnected}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a user to chat</h3>
                <p className="text-gray-500">Choose someone from the users list to start a private conversation</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
