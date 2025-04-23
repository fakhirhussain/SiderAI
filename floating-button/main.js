const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const Store = require("electron-store");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Initialize store for saving window positions, states, and settings
const store = new Store();

// Store the Groq API key
store.set(
  "groq_api_key",
  "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"
);

let mainWindow;
let floatingWindow;

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

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
  });

  // Load the app
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile("index.html");
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", () => {
    if (floatingWindow) {
      floatingWindow.close();
    }
  });

  // Handle minimize event
  mainWindow.on("minimize", () => {
    mainWindow.hide();
    createFloatingWindow();
  });
}

function createFloatingWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Get saved position or use default
  const savedPosition = store.get("floatingPosition");
  const x = savedPosition ? savedPosition.x : width - 80;
  const y = savedPosition ? savedPosition.y : height / 2 - 30;

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
  });

  floatingWindow.loadFile("floating.html");

  // Make the window draggable
  let isDragging = false;
  let startPosition = { x: 0, y: 0 };

  ipcMain.on("floating-button-mouse-down", (event, clientX, clientY) => {
    isDragging = true;
    const windowPosition = floatingWindow.getPosition();
    startPosition = {
      x: clientX - windowPosition[0],
      y: clientY - windowPosition[1],
    };
  });

  ipcMain.on("floating-button-mouse-move", (event, clientX, clientY) => {
    if (isDragging) {
      const x = clientX - startPosition.x;
      const y = clientY - startPosition.y;
      floatingWindow.setPosition(x, y);
    }
  });

  ipcMain.on("floating-button-mouse-up", () => {
    isDragging = false;
    // Save position
    const position = floatingWindow.getPosition();
    store.set("floatingPosition", { x: position[0], y: position[1] });
  });

  // Restore main window when floating button is clicked
  ipcMain.on("restore-app", () => {
    if (floatingWindow) {
      floatingWindow.close();
      floatingWindow = null;
    }
    mainWindow.show();
    mainWindow.restore();
  });

  floatingWindow.on("closed", () => {
    floatingWindow = null;
    ipcMain.removeAllListeners("floating-button-mouse-down");
    ipcMain.removeAllListeners("floating-button-mouse-move");
    ipcMain.removeAllListeners("floating-button-mouse-up");
    ipcMain.removeAllListeners("restore-app");
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Groq API handler
ipcMain.handle("call-groq-api", async (event, message, model) => {
  try {
    const apiKey = store.get("groq_api_key");
    if (!apiKey) {
      throw new Error("Groq API key not found. Please add it in settings.");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Groq API error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
});

// API key management
ipcMain.handle("get-api-keys", () => {
  return {
    claude: store.get("claude_api_key", ""),
    chatgpt: store.get("openai_api_key", ""),
    v0: store.get("v0_api_key", ""),
    groq: store.get("groq_api_key", ""),
  };
});

ipcMain.handle("save-api-keys", (event, keys) => {
  store.set("claude_api_key", keys.claude);
  store.set("openai_api_key", keys.chatgpt);
  store.set("v0_api_key", keys.v0);
  // Don't overwrite the Groq API key that we've already set
  return true;
});

// Settings management
ipcMain.handle("get-settings", () => {
  return {
    theme: store.get("theme", "light"),
  };
});

ipcMain.handle("save-settings", (event, settings) => {
  store.set("theme", settings.theme);
  return true;
});

// Conversation history
ipcMain.handle("get-conversation-history", () => {
  return store.get("conversation_history", []);
});

ipcMain.handle("save-conversation-history", (event, history) => {
  store.set("conversation_history", history);
  return true;
});

ipcMain.handle("clear-conversation-history", () => {
  store.set("conversation_history", []);
  return true;
});
