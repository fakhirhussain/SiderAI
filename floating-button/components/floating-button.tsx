"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { X, Maximize2, Settings, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function FloatingAIInterface() {
  // State for the floating window
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // State for the AI interface
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [userInput, setUserInput] = useState("");
  const [conversation, setConversation] = useState<
    { role: string; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");

  // State for settings
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("groq_api_key") ||
      "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"
  );

  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of conversation when it updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const minimize = () => {
    setIsMinimized(true);
  };

  const restore = () => {
    setIsMinimized(false);
  };

  // Groq API functionality
  const sendMessage = async () => {
    if (!userInput.trim()) return;

    if (!apiKey) {
      setConversation([
        ...conversation,
        {
          role: "system",
          content: `Error: Groq API key is not set. Please add it in Settings.`,
        },
      ]);
      setStatusMessage(`Error: Groq API key missing`);
      return;
    }

    // Add user message to conversation
    const newConversation = [
      ...conversation,
      { role: "user", content: userInput },
    ];
    setConversation(newConversation);
    setUserInput("");
    setIsLoading(true);
    setStatusMessage(`Sending message to Groq (${selectedModel})...`);

    try {
      const response = await callGroqAPI(userInput, apiKey, selectedModel);

      setConversation([
        ...newConversation,
        {
          role: "assistant",
          content: response || "No response received",
        },
      ]);
      setStatusMessage("Response received");
    } catch (error) {
      setConversation([
        ...newConversation,
        {
          role: "system",
          content: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ]);
      setStatusMessage("Error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const callGroqAPI = async (
    message: string,
    apiKey: string,
    model: string
  ) => {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: message }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} - ${await response.text()}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const saveSettings = () => {
    // Save API key to localStorage
    localStorage.setItem("groq_api_key", apiKey);
    setShowSettings(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Ctrl+Enter
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

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
                <span className="text-white font-medium">
                  Groq AI Interface
                </span>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[180px] h-7 bg-white/20 border-0 text-white">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemma2-9b-it">gemma2-9b-it</SelectItem>
                    <SelectItem value="llama-3.3-70b-versatile">
                      llama-3.3-70b-versatile
                    </SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">
                      llama-3.1-8b-instant
                    </SelectItem>
                    <SelectItem value="llama-guard-3-8b">
                      llama-guard-3-8b
                    </SelectItem>
                    <SelectItem value="llama3-70b-8192">
                      llama3-70b-8192
                    </SelectItem>
                    <SelectItem value="llama3-8b-8192">
                      llama3-8b-8192
                    </SelectItem>
                    <SelectItem value="whisper-large-v3">
                      whisper-large-v3
                    </SelectItem>
                    <SelectItem value="whisper-large-v3-turbo">
                      whisper-large-v3-turbo
                    </SelectItem>
                    <SelectItem value="distil-whisper-large-v3-en">
                      distil-whisper-large-v3-en
                    </SelectItem>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={minimize}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={minimize}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[400px]">
                <ScrollArea className="flex-1 p-4 border-b">
                  {conversation.map((msg, index) => (
                    <div
                      key={index}
                      className={`mb-3 ${
                        msg.role === "user" ? "text-right" : ""
                      }`}
                    >
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
                        {msg.role === "assistant" && <strong>Groq: </strong>}
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
                <div className="px-3 py-1 text-xs text-gray-500 border-t">
                  {statusMessage}
                </div>
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
              <Label htmlFor="groq-key" className="text-right">
                Groq API Key
              </Label>
              <Input
                id="groq-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
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
  );
}
