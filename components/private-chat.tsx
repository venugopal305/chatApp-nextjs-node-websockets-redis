"use client"

import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Users, LogOut, MessageCircle } from "lucide-react"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
    })

    newSocket.on("connect", () => {
      setIsConnected(true)
      newSocket.emit("login", username)
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    newSocket.on("users_list", (userList: string[]) => {
      setUsers(userList)
    })

    newSocket.on("user_online", (user: string) => {
      setUsers((prev) => (prev.includes(user) ? prev : [...prev, user]))
    })

    newSocket.on("user_offline", (user: string) => {
      setUsers((prev) => prev.filter((u) => u !== user))
    })

    newSocket.on("conversation_started", (data) => {
      setMessages(data.messages)
      setSelectedUser(data.targetUser)
    })

    newSocket.on("receive_private_message", (message: Message) => {
      // Only show messages for current conversation
      if (selectedUser && (message.sender === selectedUser || message.targetUser === selectedUser)) {
        setMessages((prev) => [...prev, message])
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

    return () => {
      newSocket.close()
    }
  }, [username, selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const startConversation = (targetUser: string) => {
    if (socket) {
      socket.emit("start_conversation", targetUser)
      setMessages([]) // Clear previous messages
    }
  }

  const sendMessage = () => {
    if (newMessage.trim() && socket && selectedUser) {
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
    }
  }

  const handleTyping = () => {
    if (socket && selectedUser) {
      socket.emit("typing", selectedUser)

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", selectedUser)
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-2rem)]">
        {/* Users Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Users ({users.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
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
