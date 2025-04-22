// DOM Elements
const aiSelect = document.getElementById("ai-select")
const userInput = document.getElementById("user-input")
const sendButton = document.getElementById("send-button")
const conversationContainer = document.getElementById("conversation-container")
const statusBar = document.getElementById("status-bar")
const settingsButton = document.getElementById("settings-button")
const settingsModal = document.getElementById("settings-modal")
const cancelSettingsButton = document.getElementById("cancel-settings")
const saveSettingsButton = document.getElementById("save-settings")
const themeToggle = document.getElementById("theme-toggle")
const themeIcon = document.getElementById("theme-icon")
const themeSelect = document.getElementById("theme-select")
const claudeKeyInput = document.getElementById("claude-key")
const openaiKeyInput = document.getElementById("openai-key")
const v0KeyInput = document.getElementById("v0-key")
const clearButton = document.getElementById("clear-button")
const clearModal = document.getElementById("clear-modal")
const cancelClearButton = document.getElementById("cancel-clear")
const confirmClearButton = document.getElementById("confirm-clear")

// State
let conversation = []
let isLoading = false
let theme = "light"

// Initialize the app
async function initApp() {
  // Load conversation history
  conversation = await window.api.getConversationHistory()
  renderConversation()

  // Load settings
  const settings = await window.api.getSettings()
  theme = settings.theme || "light"
  themeSelect.value = theme
  applyTheme(theme)

  // Load API keys
  const apiKeys = await window.api.getAPIKeys()
  claudeKeyInput.value = apiKeys.claude || ""
  openaiKeyInput.value = apiKeys.chatgpt || ""
  v0KeyInput.value = apiKeys.v0 || ""

  // Add welcome message if conversation is empty
  if (conversation.length === 0) {
    conversation.push({
      role: "assistant",
      content:
        "Welcome to the Multi-AI Interface! This version uses mock responses for demonstration. Try asking a question or saying hello!",
    })
    renderConversation()
    await window.api.saveConversationHistory(conversation)
  }
}

// Render the conversation
function renderConversation() {
  conversationContainer.innerHTML = ""

  conversation.forEach((msg) => {
    const messageElement = document.createElement("div")
    messageElement.className = `message ${msg.role}`

    // Format the content (handle code blocks)
    let formattedContent = msg.content

    // Simple code block detection and formatting
    formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${code}</code></pre>`
    })

    messageElement.innerHTML = formattedContent
    conversationContainer.appendChild(messageElement)
  })

  // Scroll to bottom
  conversationContainer.scrollTop = conversationContainer.scrollHeight
}

// Send a message
async function sendMessage() {
  const message = userInput.value.trim()
  if (!message || isLoading) return

  // Add user message to conversation
  conversation.push({ role: "user", content: message })
  userInput.value = ""
  renderConversation()

  // Update UI state
  isLoading = true
  sendButton.disabled = true
  statusBar.textContent = `Sending message to ${aiSelect.value}...`

  try {
    // Call the AI API
    const response = await window.api.callAI(message, aiSelect.value)

    // Add AI response to conversation
    conversation.push({ role: "assistant", content: response })
    renderConversation()

    // Save conversation history
    await window.api.saveConversationHistory(conversation)

    statusBar.textContent = "Response received"
  } catch (error) {
    console.error("Error calling AI:", error)
    conversation.push({ role: "system", content: `Error: ${error.message || "Failed to get response"}` })
    renderConversation()
    statusBar.textContent = "Error occurred"
  } finally {
    isLoading = false
    sendButton.disabled = false
  }
}

// Apply theme
function applyTheme(themeName) {
  if (themeName === "system") {
    // Check system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme")
      themeIcon.innerHTML =
        '<path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path><path d="M12 8a2.83 2.83 0 0 1 2 .83"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>'
    } else {
      document.body.classList.remove("dark-theme")
      themeIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>'
    }
  } else if (themeName === "dark") {
    document.body.classList.add("dark-theme")
    themeIcon.innerHTML =
      '<path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path><path d="M12 8a2.83 2.83 0 0 1 2 .83"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>'
  } else {
    document.body.classList.remove("dark-theme")
    themeIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>'
  }
}

// Toggle theme
function toggleTheme() {
  theme = document.body.classList.contains("dark-theme") ? "light" : "dark"
  themeSelect.value = theme
  applyTheme(theme)
  window.api.saveSettings({ theme })
}

// Save settings
async function saveSettings() {
  // Save API keys
  const apiKeys = {
    claude: claudeKeyInput.value,
    chatgpt: openaiKeyInput.value,
    v0: v0KeyInput.value,
  }
  await window.api.saveAPIKeys(apiKeys)

  // Save theme
  theme = themeSelect.value
  applyTheme(theme)
  await window.api.saveSettings({ theme })

  // Close modal
  settingsModal.style.display = "none"
  statusBar.textContent = "Settings saved"
}

// Clear conversation
async function clearConversation() {
  conversation = [
    {
      role: "assistant",
      content: "Conversation cleared. How can I help you today?",
    },
  ]
  renderConversation()
  await window.api.saveConversationHistory(conversation)
  clearModal.style.display = "none"
  statusBar.textContent = "Conversation cleared"
}

// Event Listeners
userInput.addEventListener("input", () => {
  sendButton.disabled = userInput.value.trim() === "" || isLoading

  // Auto-resize textarea
  userInput.style.height = "auto"
  userInput.style.height = `${userInput.scrollHeight}px`
})

userInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault()
    sendMessage()
  }
})

sendButton.addEventListener("click", sendMessage)

settingsButton.addEventListener("click", () => {
  settingsModal.style.display = "flex"
})

cancelSettingsButton.addEventListener("click", () => {
  settingsModal.style.display = "none"
})

saveSettingsButton.addEventListener("click", saveSettings)

themeToggle.addEventListener("click", toggleTheme)

clearButton.addEventListener("click", () => {
  clearModal.style.display = "flex"
})

cancelClearButton.addEventListener("click", () => {
  clearModal.style.display = "none"
})

confirmClearButton.addEventListener("click", clearConversation)

// Initialize the app
initApp()
