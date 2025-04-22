"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, Maximize2, Settings, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function FloatingAIInterface() {
  // State for the floating window
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // State for the AI interface
  const [selectedAI, setSelectedAI] = useState("claude")
  const [userInput, setUserInput] = useState("")
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Ready")

  // State for settings
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    claude: localStorage.getItem("claude_api_key") || "",
    chatgpt: localStorage.getItem("openai_api_key") || "",
    v0: localStorage.getItem("v0_api_key") || "",
  })

  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of conversation when it updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [conversation])

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const minimize = () => {
    setIsMinimized(true)
  }

  const restore = () => {
    setIsMinimized(false)
  }

  // AI functionality
  const sendMessage = async () => {
    if (!userInput.trim()) return

    const apiKey = apiKeys[selectedAI.split(".")[0] as keyof typeof apiKeys]
    if (!apiKey) {
      setConversation([
        ...conversation,
        { role: "system", content: `Error: API key for ${selectedAI} is not set. Please add it in Settings.` },
      ])
      setStatusMessage(`Error: API key missing for ${selectedAI}`)
      return
    }

    // Add user message to conversation
    const newConversation = [...conversation, { role: "user", content: userInput }]
    setConversation(newConversation)
    setUserInput("")
    setIsLoading(true)
    setStatusMessage(`Sending message to ${selectedAI}...`)

    try {
      let response

      if (selectedAI === "claude") {
        response = await callClaudeAPI(userInput, apiKey)
      } else if (selectedAI === "chatgpt") {
        response = await callOpenAIAPI(userInput, apiKey)
      } else if (selectedAI === "v0.dev") {
        response = await callV0API(userInput, apiKey)
      }

      setConversation([
        ...newConversation,
        {
          role: "assistant",
          content: response || "No response received",
        },
      ])
      setStatusMessage("Response received")
    } catch (error) {
      setConversation([
        ...newConversation,
        {
          role: "system",
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
      setStatusMessage("Error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const callClaudeAPI = async (message: string, apiKey: string) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: [{ role: "user", content: message }],
      }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`)
    }

    const data = await response.json()
    return data.content[0].text
  }

  const callOpenAIAPI = async (message: string, apiKey: string) => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: message }],
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  const callV0API = async (message: string, apiKey: string) => {
    // Note: This is a placeholder for the v0.dev API
    const response = await fetch("https://api.v0.dev/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: message,
      }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${await response.text()}`)
    }

    const data = await response.json()
    return data.result || "No result from v0.dev"
  }

  const saveSettings = () => {
    // Save API keys to localStorage
    localStorage.setItem("claude_api_key", apiKeys.claude)
    localStorage.setItem("openai_api_key", apiKeys.chatgpt)
    localStorage.setItem("v0_api_key", apiKeys.v0)

    setShowSettings(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Ctrl+Enter
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <div
        className="fixed z-50"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isMinimized ? (
          <Button
            size="icon"
            className="rounded-full shadow-lg h-14 w-14 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            onClick={restore}
            onMouseDown={handleMouseDown}
          >
            <span className="text-xl">🧠</span>
          </Button>
        ) : (
          <Card className="w-[400px] shadow-lg">
            <CardHeader
              className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 flex flex-row items-center justify-between cursor-move"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Multi-AI Interface</span>
                <Select value={selectedAI} onValueChange={setSelectedAI}>
                  <SelectTrigger className="w-[120px] h-7 bg-white/20 border-0 text-white">
                    <SelectValue placeholder="Select AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    <SelectItem value="v0.dev">v0.dev</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={minimize}>
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={minimize}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[400px]">
                <ScrollArea className="flex-1 p-4 border-b">
                  {conversation.map((msg, index) => (
                    <div key={index} className={`mb-3 ${msg.role === "user" ? "text-right" : ""}`}>
                      <div
                        className={`inline-block p-2 rounded-lg max-w-[85%] ${
                          msg.role === "user"
                            ? "bg-blue-100 text-blue-900"
                            : msg.role === "system"
                              ? "bg-red-100 text-red-900"
                              : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {msg.role === "user" && <strong>You: </strong>}
                        {msg.role === "assistant" && (
                          <strong>{selectedAI.charAt(0).toUpperCase() + selectedAI.slice(1)}: </strong>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={conversationEndRef} />
                </ScrollArea>
                <div className="p-3 flex gap-2">
                  <Textarea
                    placeholder="Type your message here..."
                    className="resize-none"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={isLoading || !userInput.trim()}
                    className="self-end"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="px-3 py-1 text-xs text-gray-500 border-t">{statusMessage}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="claude-key" className="text-right">
                Claude API Key
              </Label>
              <Input
                id="claude-key"
                type="password"
                value={apiKeys.claude}
                onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="openai-key" className="text-right">
                OpenAI API Key
              </Label>
              <Input
                id="openai-key"
                type="password"
                value={apiKeys.chatgpt}
                onChange={(e) => setApiKeys({ ...apiKeys, chatgpt: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="v0-key" className="text-right">
                v0.dev API Key
              </Label>
              <Input
                id="v0-key"
                type="password"
                value={apiKeys.v0}
                onChange={(e) => setApiKeys({ ...apiKeys, v0: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
