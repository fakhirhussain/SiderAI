"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import "./App.css"
import { Settings, Send, Moon, Sun } from "./components/Icons"

interface Message {
  role: string
  content: string
}

interface AppSettings {
  theme: string
  fontSize: string
}

function App() {
  const [selectedAI, setSelectedAI] = useState<string>("free-gpt")
  const [userInput, setUserInput] = useState<string>("")
  const [conversation, setConversation] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>("Ready")
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [settings, setSettings] = useState<AppSettings>({
    theme: "light",
    fontSize: "medium",
  })

  const conversationEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.api.getSettings()
        setSettings(savedSettings)
        document.documentElement.classList.toggle("dark-theme", savedSettings.theme === "dark")
        document.documentElement.setAttribute("data-font-size", savedSettings.fontSize)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()

    // Add welcome message
    setConversation([
      {
        role: "assistant",
        content:
          "Welcome to the Multi-AI Interface! This version uses free APIs and mock responses for demonstration. No API keys required. Try asking a question or saying hello!",
      },
    ])
  }, [])

  // Scroll to bottom of conversation when it updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [conversation])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [userInput])

  const sendMessage = async () => {
    if (!userInput.trim()) return

    // Add user message to conversation
    const newConversation = [...conversation, { role: "user", content: userInput }]
    setConversation(newConversation)
    setUserInput("")
    setIsLoading(true)
    setStatusMessage(`Sending message to ${selectedAI}...`)

    try {
      const response = await window.api.callFreeAI(userInput, selectedAI)

      setConversation([...newConversation, { role: "assistant", content: response || "No response received" }])
      setStatusMessage("Response received")
    } catch (error) {
      setConversation([
        ...newConversation,
        { role: "system", content: `Error: ${error instanceof Error ? error.message : String(error)}` },
      ])
      setStatusMessage("Error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      await window.api.saveSettings(settings)
      document.documentElement.classList.toggle("dark-theme", settings.theme === "dark")
      document.documentElement.setAttribute("data-font-size", settings.fontSize)
      setShowSettings(false)
      setStatusMessage("Settings saved successfully")
    } catch (error) {
      setStatusMessage(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const toggleTheme = () => {
    const newTheme = settings.theme === "light" ? "dark" : "light"
    setSettings({ ...settings, theme: newTheme })
    document.documentElement.classList.toggle("dark-theme", newTheme === "dark")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Ctrl+Enter
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">Multi-AI Interface</div>
        <div className="ai-selector">
          <label htmlFor="ai-select">Select AI:</label>
          <select id="ai-select" value={selectedAI} onChange={(e) => setSelectedAI(e.target.value)}>
            <option value="free-gpt">Free GPT</option>
            <option value="mock-assistant">Mock Assistant</option>
            <option value="echo-bot">Echo Bot</option>
          </select>
        </div>
        <div className="header-buttons">
          <button
            className="icon-button"
            onClick={toggleTheme}
            title={settings.theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {settings.theme === "light" ? <Moon /> : <Sun />}
          </button>
          <button className="icon-button" onClick={() => setShowSettings(true)} title="Settings">
            <Settings />
          </button>
        </div>
      </header>

      <main className="conversation-container">
        <div className="messages">
          {conversation.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.role === "user" && <strong>You: </strong>}
                {msg.role === "assistant" && <strong>AI: </strong>}
                {msg.role === "system" && <strong>System: </strong>}
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={conversationEndRef} />
        </div>
      </main>

      <footer className="input-container">
        <textarea
          ref={textareaRef}
          placeholder="Type your message here... (Ctrl+Enter to send)"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="send-button" onClick={sendMessage} disabled={isLoading || !userInput.trim()}>
          {isLoading ? <div className="loading-spinner"></div> : <Send />}
        </button>
        <div className="status-bar">{statusMessage}</div>
      </footer>

      {showSettings && (
        <div className="settings-modal">
          <div className="settings-content">
            <h2>Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="theme-select">Theme:</label>
                <select
                  id="theme-select"
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="font-size-select">Font Size:</label>
                <select
                  id="font-size-select"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
            <div className="settings-actions">
              <button onClick={() => setShowSettings(false)}>Cancel</button>
              <button onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
