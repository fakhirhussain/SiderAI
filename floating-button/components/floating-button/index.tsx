"use client"

import type React from "react"

import { useState } from "react"

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
  const [showSettings, setShowSettings] = useState(false)

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

  return (
    <div
      className="fixed z-50"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isMinimized ? (
        <button
          className="rounded-full shadow-lg h-14 w-14 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          onClick={restore}
          onMouseDown={handleMouseDown}
        >
          <span className="text-xl">🧠</span>
        </button>
      ) : (
        <div className="w-[400px] shadow-lg bg-white rounded-lg border border-gray-200">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 flex flex-row items-center justify-between cursor-move rounded-t-lg"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Multi-AI Interface</span>
              <select
                className="bg-white/20 border-0 text-white p-1 rounded"
                value={selectedAI}
                onChange={(e) => setSelectedAI(e.target.value)}
              >
                <option value="claude">Claude</option>
                <option value="chatgpt">ChatGPT</option>
                <option value="v0.dev">v0.dev</option>
              </select>
            </div>
            <div className="flex gap-1">
              <button className="text-white hover:bg-white/20 p-1 rounded" onClick={() => setShowSettings(true)}>
                ⚙️
              </button>
              <button className="text-white hover:bg-white/20 p-1 rounded" onClick={minimize}>
                _
              </button>
              <button className="text-white hover:bg-white/20 p-1 rounded" onClick={minimize}>
                ✕
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="h-[300px] overflow-y-auto border border-gray-200 rounded p-2 mb-4">
              <p className="text-gray-500 italic">Your conversation will appear here.</p>
            </div>
            <div className="flex gap-2">
              <textarea
                className="w-full p-2 border border-gray-300 rounded resize-none"
                placeholder="Type your message here..."
                rows={3}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded self-end"
                disabled={isLoading || !userInput.trim()}
              >
                Send
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">{statusMessage}</div>
          </div>
        </div>
      )}
    </div>
  )
}
