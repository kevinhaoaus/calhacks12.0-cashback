"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

export function CursorAura() {
  const pathname = usePathname()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const rafRef = useRef<number | undefined>(undefined)
  const targetPosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPosition.current = { x: e.clientX, y: e.clientY }
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    // Smooth animation using requestAnimationFrame
    const animate = () => {
      setMousePosition((prev) => {
        const dx = targetPosition.current.x - prev.x
        const dy = targetPosition.current.y - prev.y

        return {
          x: prev.x + dx * 0.35,
          y: prev.y + dy * 0.35,
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isVisible])

  // Only show on home page
  if (pathname !== "/") {
    return null
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed pointer-events-none z-10 transition-opacity duration-300"
      style={{
        left: mousePosition.x,
        top: mousePosition.y,
        transform: "translate(-50%, -50%)",
        opacity: isVisible ? 0.6 : 0,
      }}
    >
      {/* Main gradient aura */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.12) 25%, rgba(34, 211, 238, 0.1) 50%, rgba(236, 72, 153, 0.08) 75%, transparent 100%)",
          filter: "blur(40px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Secondary inner glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          width: "250px",
          height: "250px",
          background:
            "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(96, 165, 250, 0.15) 40%, rgba(103, 232, 249, 0.1) 70%, transparent 100%)",
          filter: "blur(30px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Bright center highlight */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          width: "120px",
          height: "120px",
          background:
            "radial-gradient(circle, rgba(192, 132, 252, 0.25) 0%, rgba(147, 197, 253, 0.15) 50%, transparent 100%)",
          filter: "blur(20px)",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  )
}
