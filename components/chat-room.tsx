"use client"

import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Users, LogOut } from "lucide-react"

interface Message {
  id: string
  username: string
  message: string
  timestamp: string
  room: string
}

interface ChatRoomProps {
  username: string
  room: string
}

export default function ChatRoom({ username, room }: ChatRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [users, setUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
    })

    newSocket.on("connect", () => {
      setIsConnected(true)
      newSocket.emit("join", { username, room })
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    newSocket.on("previous_messages", (msgs: Message[]) => {
      setMessages(msgs)
    })

    newSocket.on("receive_message", (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    newSocket.on("user_joined", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          username: "System",
          message: data.message,
          timestamp: data.timestamp,
          room: room,
        },
      ])
    })

    newSocket.on("user_left", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          username: "System",
          message: data.message,
          timestamp: data.timestamp,
          room: room,
        },
      ])
    })

    newSocket.on("users_update", (userList: string[]) => {
      setUsers(userList)
    })

    newSocket.on("user_typing", (typingUsername: string) => {
      setTypingUsers((prev) => (prev.includes(typingUsername) ? prev : [...prev, typingUsername]))
    })

    newSocket.on("user_stop_typing", (typingUsername: string) => {
      setTypingUsers((prev) => prev.filter((user) => user !== typingUsername))
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [username, room])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit("send_message", { message: newMessage })
      setNewMessage("")

      // Stop typing indicator
      socket.emit("stop_typing")
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleTyping = () => {
    if (socket) {
      socket.emit("typing")

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing")
      }, 1000)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleLeave = () => {
    if (socket) {
      socket.disconnect()
    }
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-2rem)]">
        {/* Users Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Online Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className={`text-sm ${user === username ? "font-semibold text-blue-600" : ""}`}>
                    {user} {user === username && "(You)"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Room: {room}
                  <Badge variant={isConnected ? "default" : "destructive"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">Welcome, {username}!</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLeave}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.username === username ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.username === username
                          ? "bg-blue-600 text-white"
                          : message.username === "System"
                            ? "bg-gray-200 text-gray-700 text-center"
                            : "bg-white border border-gray-200"
                      }`}
                    >
                      {message.username !== "System" && message.username !== username && (
                        <p className="text-xs font-semibold mb-1 text-gray-600">{message.username}</p>
                      )}
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${message.username === username ? "text-blue-100" : "text-gray-500"}`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                      </p>
                    </div>
                  </div>
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
                  placeholder="Type your message..."
                  disabled={!isConnected}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim() || !isConnected}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
