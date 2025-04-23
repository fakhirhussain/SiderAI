const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // API calls
  callGroqApi: (message, model) =>
    ipcRenderer.invoke("call-groq-api", message, model),

  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),

  // API keys
  getApiKeys: () => ipcRenderer.invoke("get-api-keys"),
  saveApiKeys: (keys) => ipcRenderer.invoke("save-api-keys", keys),

  // Conversation history
  getConversationHistory: () => ipcRenderer.invoke("get-conversation-history"),
  saveConversationHistory: (history) =>
    ipcRenderer.invoke("save-conversation-history", history),
  clearConversationHistory: () =>
    ipcRenderer.invoke("clear-conversation-history"),

  // Window controls for floating window
  onFloatingButtonMouseDown: (clientX, clientY) =>
    ipcRenderer.send("floating-button-mouse-down", clientX, clientY),
  onFloatingButtonMouseMove: (clientX, clientY) =>
    ipcRenderer.send("floating-button-mouse-move", clientX, clientY),
  onFloatingButtonMouseUp: () => ipcRenderer.send("floating-button-mouse-up"),
  restoreApp: () => ipcRenderer.send("restore-app"),
});
