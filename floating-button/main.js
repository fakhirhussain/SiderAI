const { app, BrowserWindow, ipcMain, screen } = require("electron")
const path = require("path")
const Store = require("electron-store")
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))

// Initialize store for saving window positions, states, and settings
const store = new Store()

let mainWindow
let floatingWindow

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "icon.png"),
    show: false,
  })

  // Load the app
  const isDev = process.env.NODE_ENV === "development"
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile("index.html")
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.on("close", () => {
    if (floatingWindow) {
      floatingWindow.close()
    }
  })

  // Handle minimize event
  mainWindow.on("minimize", () => {
    mainWindow.hide()
    createFloatingWindow()
  })
}

function createFloatingWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  // Get saved position or use default
  const savedPosition = store.get("floatingPosition")
  const x = savedPosition ? savedPosition.x : width - 80
  const y = savedPosition ? savedPosition.y : height / 2 - 30

  floatingWindow = new BrowserWindow({
    width: 60,
    height: 60,
    x: x,
    y: y,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "icon.png"),
  })

  floatingWindow.loadFile("floating.html")

  // Make the window draggable
  let isDragging = false
  let startPosition = { x: 0, y: 0 }

  ipcMain.on("floating-button-mouse-down", (event, clientX, clientY) => {
    isDragging = true
    const windowPosition = floatingWindow.getPosition()
    startPosition = {
      x: clientX - windowPosition[0],
      y: clientY - windowPosition[1],
    }
  })

  ipcMain.on("floating-button-mouse-move", (event, clientX, clientY) => {
    if (isDragging) {
      const x = clientX - startPosition.x
      const y = clientY - startPosition.y
      floatingWindow.setPosition(x, y)
    }
  })

  ipcMain.on("floating-button-mouse-up", () => {
    isDragging = false
    // Save position
    const position = floatingWindow.getPosition()
    store.set("floatingPosition", { x: position[0], y: position[1] })
  })

  // Restore main window when floating button is clicked
  ipcMain.on("restore-app", () => {
    if (floatingWindow) {
      floatingWindow.close()
      floatingWindow = null
    }
    mainWindow.show()
    mainWindow.restore()
  })

  floatingWindow.on("closed", () => {
    floatingWindow = null
    ipcMain.removeAllListeners("floating-button-mouse-down")
    ipcMain.removeAllListeners("floating-button-mouse-move")
    ipcMain.removeAllListeners("floating-button-mouse-up")
    ipcMain.removeAllListeners("restore-app")
  })
}

app.whenReady().then(() => {
  createMainWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// Mock responses for demonstration
const mockResponses = {
  greeting: [
    "Hello! How can I assist you today?",
    "Hi there! What can I help you with?",
    "Greetings! How may I be of service?",
    "Hello! I'm here to help. What do you need?",
  ],
  question: [
    "That's an interesting question. Based on my knowledge, ",
    "I'd be happy to answer that. ",
    "Great question! Here's what I know: ",
    "Let me think about that. ",
  ],
  facts: [
    "The Earth is approximately 4.54 billion years old.",
    "The Great Barrier Reef is the world's largest coral reef system.",
    "The human body contains about 60% water.",
    "A group of flamingos is called a flamboyance.",
    "The shortest war in history was between Britain and Zanzibar on August 27, 1896. Zanzibar surrendered after 38 minutes.",
    "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion.",
    "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly good to eat.",
    "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate once on its axis, but only 225 Earth days to go around the Sun.",
    "The fingerprints of koalas are so similar to humans that they have on occasion been confused at crime scenes.",
    "The Hawaiian alphabet has only 12 letters.",
  ],
  coding: [
    "Here's a simple Python function to solve that:\n\n```python\ndef solution(input_data):\n    # Process the input\n    result = input_data.split()\n    return result\n```",
    "You could implement that in JavaScript like this:\n\n```javascript\nfunction processData(data) {\n  const result = data.map(item => item * 2);\n  return result;\n}\n```",
    "Here's how you might approach this problem:\n\n1. Parse the input\n2. Apply the algorithm\n3. Format the output",
    "This is a classic problem that can be solved using dynamic programming. The key insight is to break it down into smaller subproblems.",
  ],
}

// Generate a mock response based on the input
function generateMockResponse(message, model) {
  // Add a delay to simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Check for common patterns in the message
      const lowerMessage = message.toLowerCase()
      let response = ""

      // Model-specific prefixes
      const prefix =
        model === "claude" ? "Claude: " : model === "chatgpt" ? "ChatGPT: " : model === "v0.dev" ? "v0.dev: " : ""

      // Greeting detection
      if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.match(/^(hey|greetings)/)) {
        response = mockResponses.greeting[Math.floor(Math.random() * mockResponses.greeting.length)]
      }
      // Question detection
      else if (lowerMessage.includes("?")) {
        const questionResponse = mockResponses.question[Math.floor(Math.random() * mockResponses.question.length)]
        const factResponse = mockResponses.facts[Math.floor(Math.random() * mockResponses.facts.length)]
        response = questionResponse + factResponse
      }
      // Code request detection
      else if (
        lowerMessage.includes("code") ||
        lowerMessage.includes("program") ||
        lowerMessage.includes("function") ||
        lowerMessage.includes("algorithm") ||
        lowerMessage.includes("solve")
      ) {
        response = mockResponses.coding[Math.floor(Math.random() * mockResponses.coding.length)]
      }
      // Default response with a random fact
      else {
        response =
          'I processed your message: "' +
          message +
          '". ' +
          mockResponses.facts[Math.floor(Math.random() * mockResponses.facts.length)]
      }

      resolve(prefix + response)
    }, 1000) // 1 second delay to simulate API call
  })
}

// API handlers
ipcMain.handle("call-ai-api", async (event, message, model) => {
  try {
    // For demo purposes, we'll use mock responses
    const response = await generateMockResponse(message, model)
    return response
  } catch (error) {
    console.error("AI API error:", error)
    return "Sorry, I encountered an error processing your request."
  }
})

// API key management
ipcMain.handle("get-api-keys", () => {
  return {
    claude: store.get("claude_api_key", ""),
    chatgpt: store.get("openai_api_key", ""),
    v0: store.get("v0_api_key", ""),
  }
})

ipcMain.handle("save-api-keys", (event, keys) => {
  store.set("claude_api_key", keys.claude)
  store.set("openai_api_key", keys.chatgpt)
  store.set("v0_api_key", keys.v0)
  return true
})

// Settings management
ipcMain.handle("get-settings", () => {
  return {
    theme: store.get("theme", "light"),
  }
})

ipcMain.handle("save-settings", (event, settings) => {
  store.set("theme", settings.theme)
  return true
})

// Conversation history
ipcMain.handle("get-conversation-history", () => {
  return store.get("conversation_history", [])
})

ipcMain.handle("save-conversation-history", (event, history) => {
  store.set("conversation_history", history)
  return true
})

ipcMain.handle("clear-conversation-history", () => {
  store.set("conversation_history", [])
  return true
})
