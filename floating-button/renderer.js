// DOM Elements
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const conversationContainer = document.getElementById("conversation-container");
const aiSelect = document.getElementById("ai-select");
const statusBar = document.getElementById("status-bar");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const settingsButton = document.getElementById("settings-button");
const clearButton = document.getElementById("clear-button");
const settingsModal = document.getElementById("settings-modal");
const clearModal = document.getElementById("clear-modal");
const cancelSettings = document.getElementById("cancel-settings");
const saveSettings = document.getElementById("save-settings");
const cancelClear = document.getElementById("cancel-clear");
const confirmClear = document.getElementById("confirm-clear");
const themeSelect = document.getElementById("theme-select");
const claudeKeyInput = document.getElementById("claude-key");
const openaiKeyInput = document.getElementById("openai-key");
const v0KeyInput = document.getElementById("v0-key");

// State
let conversationHistory = [];
let isProcessing = false;
let currentTheme = "light";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load conversation history
  try {
    conversationHistory = await window.electronAPI.getConversationHistory();
    renderConversation();
  } catch (error) {
    console.error("Failed to load conversation history:", error);
  }

  // Load settings
  try {
    const settings = await window.electronAPI.getSettings();
    currentTheme = settings.theme;
    themeSelect.value = currentTheme;
    applyTheme(currentTheme);
  } catch (error) {
    console.error("Failed to load settings:", error);
  }

  // Load API keys
  try {
    const keys = await window.electronAPI.getApiKeys();
    claudeKeyInput.value = keys.claude || "";
    openaiKeyInput.value = keys.chatgpt || "";
    v0KeyInput.value = keys.v0 || "";
  } catch (error) {
    console.error("Failed to load API keys:", error);
  }
});

// Event Listeners
userInput.addEventListener("input", () => {
  sendButton.disabled = userInput.value.trim() === "";
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !sendButton.disabled) {
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);
themeToggle.addEventListener("click", toggleTheme);
settingsButton.addEventListener("click", openSettings);
clearButton.addEventListener("click", () => {
  clearModal.style.display = "flex";
});

cancelSettings.addEventListener("click", () => {
  settingsModal.style.display = "none";
});

saveSettings.addEventListener("click", saveSettingsHandler);

cancelClear.addEventListener("click", () => {
  clearModal.style.display = "none";
});

confirmClear.addEventListener("click", clearConversation);

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = "none";
  }
  if (e.target === clearModal) {
    clearModal.style.display = "none";
  }
});

// Functions
async function sendMessage() {
  if (isProcessing) return;

  const message = userInput.value.trim();
  if (!message) return;

  isProcessing = true;
  statusBar.textContent = "Processing...";

  // Add user message to conversation
  const userMessageObj = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };

  conversationHistory.push(userMessageObj);
  renderConversation();

  // Clear input
  userInput.value = "";
  sendButton.disabled = true;

  // Scroll to bottom
  conversationContainer.scrollTop = conversationContainer.scrollHeight;

  try {
    // Get selected model
    const selectedModel = aiSelect.value;

    // Call API
    const response = await window.electronAPI.callGroqApi(
      message,
      selectedModel
    );

    // Add AI response to conversation
    const aiMessageObj = {
      role: "assistant",
      content: response,
      model: selectedModel,
      timestamp: new Date().toISOString(),
    };

    conversationHistory.push(aiMessageObj);
    renderConversation();

    // Save conversation history
    await window.electronAPI.saveConversationHistory(conversationHistory);

    statusBar.textContent = "Ready";
  } catch (error) {
    console.error("Error sending message:", error);
    statusBar.textContent = "Error: " + error.message;

    // Add error message to conversation
    const errorMessageObj = {
      role: "system",
      content: "Error: Failed to get response from AI.",
      timestamp: new Date().toISOString(),
    };

    conversationHistory.push(errorMessageObj);
    renderConversation();
  } finally {
    isProcessing = false;
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
  }
}

function renderConversation() {
  conversationContainer.innerHTML = "";

  conversationHistory.forEach((msg) => {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${msg.role}-message`;

    let header = "";
    if (msg.role === "user") {
      header = '<div class="message-header">You</div>';
    } else if (msg.role === "assistant") {
      header = `<div class="message-header">AI (${
        msg.model || "Unknown"
      })</div>`;
    } else {
      header = '<div class="message-header">System</div>';
    }

    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    const timeDisplay = `<div class="message-time">${timestamp}</div>`;

    // Process content for code blocks
    let content = msg.content;
    content = processCodeBlocks(content);

    messageElement.innerHTML = `
      <div class="message-container">
        ${header}
        <div class="message-content">${content}</div>
        ${timeDisplay}
      </div>
    `;

    conversationContainer.appendChild(messageElement);
  });
}

function processCodeBlocks(content) {
  // Replace ```language ... ``` with formatted code blocks
  return content.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (match, language, code) => {
      const lang = language || "plaintext";
      return `<pre class="code-block ${lang}"><code>${escapeHtml(
        code
      )}</code></pre>`;
    }
  );
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function toggleTheme() {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(currentTheme);

  // Save theme setting
  const settings = await window.electronAPI.getSettings();
  settings.theme = currentTheme;
  await window.electronAPI.saveSettings(settings);
}

function applyTheme(theme) {
  document.body.className = theme;

  // Update theme icon
  if (theme === "dark") {
    themeIcon.innerHTML = `
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
    `;
  } else {
    themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    `;
  }
}

function openSettings() {
  settingsModal.style.display = "flex";
}

async function saveSettingsHandler() {
  try {
    // Save API keys
    await window.electronAPI.saveApiKeys({
      claude: claudeKeyInput.value,
      chatgpt: openaiKeyInput.value,
      v0: v0KeyInput.value,
    });

    // Save theme setting
    const theme = themeSelect.value;
    await window.electronAPI.saveSettings({
      theme: theme,
    });

    // Apply theme if changed
    if (theme !== currentTheme) {
      currentTheme = theme;
      applyTheme(currentTheme);
    }

    settingsModal.style.display = "none";
    statusBar.textContent = "Settings saved";
  } catch (error) {
    console.error("Failed to save settings:", error);
    statusBar.textContent = "Error saving settings";
  }
}

async function clearConversation() {
  try {
    conversationHistory = [];
    await window.electronAPI.clearConversationHistory();
    renderConversation();
    clearModal.style.display = "none";
    statusBar.textContent = "Conversation cleared";
  } catch (error) {
    console.error("Failed to clear conversation:", error);
    statusBar.textContent = "Error clearing conversation";
  }
}
