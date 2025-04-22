const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  callAI: (message, model) => ipcRenderer.invoke("call-ai-api", message, model),
  getAPIKeys: () => ipcRenderer.invoke("get-api-keys"),
  saveAPIKeys: (keys) => ipcRenderer.invoke("save-api-keys", keys),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getConversationHistory: () => ipcRenderer.invoke("get-conversation-history"),
  saveConversationHistory: (history) => ipcRenderer.invoke("save-conversation-history", history),
  clearConversationHistory: () => ipcRenderer.invoke("clear-conversation-history"),
  onFloatingButtonMouseDown: (clientX, clientY) => ipcRenderer.send("floating-button-mouse-down", clientX, clientY),
  onFloatingButtonMouseMove: (clientX, clientY) => ipcRenderer.send("floating-button-mouse-move", clientX, clientY),
  onFloatingButtonMouseUp: () => ipcRenderer.send("floating-button-mouse-up"),
  restoreApp: () => ipcRenderer.send("restore-app"),
})
