"use client"

import { useEffect } from "react"
import "./FloatingButton.css"

function FloatingButton() {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      window.api.onFloatingButtonMouseDown(e.clientX, e.clientY)

      const handleMouseMove = (e: MouseEvent) => {
        window.api.onFloatingButtonMouseMove(e.clientX, e.clientY)
      }

      const handleMouseUp = () => {
        window.api.onFloatingButtonMouseUp()
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousedown", handleMouseDown)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
    }
  }, [])

  const handleClick = () => {
    window.api.restoreApp()
  }

  return (
    <div className="floating-button" onClick={handleClick}>
      🧠
    </div>
  )
}

export default FloatingButton
