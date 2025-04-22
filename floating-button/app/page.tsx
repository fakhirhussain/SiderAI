import ClientWrapper from "@/components/client-wrapper"

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Multi-AI Interface</h1>
      <p className="mb-2">This is a web-based version of your Python tkinter AI application.</p>
      <p>Features:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Interact with multiple AI models (Claude, ChatGPT, v0.dev)</li>
        <li>Configure API keys in settings</li>
        <li>Minimize to a floating button</li>
        <li>Drag the window by its header</li>
        <li>Press Ctrl+Enter to send messages</li>
      </ul>

      <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-300 mt-4">
        <p className="text-yellow-800">
          <strong>Note:</strong> This is a client-side demo. In a production environment, you should never store API
          keys in the browser. Instead, use server-side API routes to make the API calls securely.
        </p>
      </div>

      <ClientWrapper />
    </main>
  )
}
