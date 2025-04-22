"use client"

import dynamic from "next/dynamic"

// Import the component with no SSR to avoid localStorage errors
const FloatingAIInterface = dynamic(() => import("@/components/floating-button"), {
  ssr: false,
})

export default function ClientWrapper() {
  return <FloatingAIInterface />
}
