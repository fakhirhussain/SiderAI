/// <reference types="vite/client" />

interface Window {
  api: {
    callFreeAI: (message: string, model: string) => Promise<string>
    getSettings: () => Promise<any>
    saveSettings: (settings: any) => Promise<boolean>
    onFloatingButtonMouseDown: (clientX: number, clientY: number) => void
    onFloatingButtonMouseMove: (clientX: number, clientY: number) => void
    onFloatingButtonMouseUp: () => void
    restoreApp: () => void
  }
}
