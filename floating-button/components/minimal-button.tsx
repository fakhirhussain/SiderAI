"use client"

import { useState } from "react"

export default function MinimalButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white p-4 rounded-lg shadow-lg w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">AI Assistant</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <div className="border rounded p-2 h-40 mb-2 overflow-y-auto">
            <p className="text-gray-500">Conversation will appear here.</p>
          </div>
          <div className="flex gap-2">
            <input type="text" className="flex-1 border rounded p-2" placeholder="Type a message..." />
            <button className="bg-blue-500 text-white px-3 py-2 rounded">Send</button>
          </div>
        </div>
      ) : (
        <button
          className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          🧠
        </button>
      )}
    </div>
  )
}
