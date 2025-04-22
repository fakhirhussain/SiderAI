import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import FloatingButton from "./FloatingButton"

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/floating-button",
    element: <FloatingButton />,
  },
])

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
