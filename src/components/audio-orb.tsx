"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { VisualizerColors } from "@/lib/themes/types"

interface AudioOrbProps {
  isPlaying: boolean
  audioData?: Uint8Array | null
  size?: number
  className?: string
  colors?: VisualizerColors
}

// Default colors (indigo theme)
const defaultColors: VisualizerColors = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  tertiary: "#a855f7",
  glow: "rgba(139, 92, 246, 0.6)",
  background: "rgba(99, 102, 241, 0.1)",
  highlight: "#ec4899",
}

// Helper to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  // Handle rgba strings directly
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
    return hex
  }
  
  // Remove # if present
  hex = hex.replace("#", "")
  
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function AudioOrb({ 
  isPlaying, 
  audioData, 
  size = 300, 
  className,
  colors = defaultColors,
}: AudioOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const rotationRef = useRef(0)

  const drawOrb = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const canvasWidth = canvas.width / dpr
    const canvasHeight = canvas.height / dpr

    // Guard against invalid canvas dimensions to prevent gradient errors
    if (!canvasWidth || !canvasHeight || canvasWidth <= 0 || canvasHeight <= 0 || !isFinite(canvasWidth) || !isFinite(canvasHeight)) {
      animationRef.current = requestAnimationFrame(drawOrb)
      return
    }

    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const radius = Math.min(canvasWidth, canvasHeight) / 2 * 0.8

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Get average audio level
    let avgLevel = 0
    if (audioData && audioData.length > 0) {
      const sum = audioData.reduce((acc, val) => acc + val, 0)
      avgLevel = sum / audioData.length / 255
    }

    // Rotate when playing
    if (isPlaying) {
      rotationRef.current += 0.01 + (avgLevel * 0.02)
    }

    // Ensure valid radius for gradient
    const safeRadius = Math.max(radius, 1)
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, safeRadius
    )

    if (isPlaying) {
      const intensity = 0.3 + avgLevel * 0.7
      gradient.addColorStop(0, hexToRgba(colors.primary, intensity))
      gradient.addColorStop(0.5, hexToRgba(colors.secondary, intensity * 0.8))
      gradient.addColorStop(1, hexToRgba(colors.tertiary, intensity * 0.6))
    } else {
      gradient.addColorStop(0, hexToRgba(colors.primary, 0.3))
      gradient.addColorStop(0.5, hexToRgba(colors.secondary, 0.2))
      gradient.addColorStop(1, hexToRgba(colors.tertiary, 0.1))
    }

    // Draw segmented orb
    const segments = 8
    const angleStep = (Math.PI * 2) / segments

    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep + rotationRef.current
      const nextAngle = (i + 1) * angleStep + rotationRef.current - 0.1

      // Audio-reactive radius
      let segmentRadius = radius
      if (audioData && audioData.length > 0) {
        const dataIndex = Math.floor((i / segments) * (audioData.length / 2))
        const dataValue = audioData[dataIndex] / 255
        segmentRadius = radius * (0.8 + dataValue * 0.4)
      }

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      
      // Create curved segment
      const arcRadius = segmentRadius * (0.7 + (isPlaying ? avgLevel * 0.3 : 0))
      ctx.arc(centerX, centerY, arcRadius, angle, nextAngle)
      ctx.closePath()

      ctx.fillStyle = gradient
      ctx.fill()

      // Add glow effect using theme glow color
      if (isPlaying) {
        ctx.shadowBlur = 20 + avgLevel * 30
        ctx.shadowColor = colors.glow
      }
    }

    // Draw inner circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = isPlaying 
      ? `rgba(255, 255, 255, ${0.1 + avgLevel * 0.2})`
      : "rgba(255, 255, 255, 0.05)"
    ctx.fill()

    // Reset shadow
    ctx.shadowBlur = 0

    animationRef.current = requestAnimationFrame(drawOrb)
  }, [isPlaying, audioData, size, colors])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.scale(dpr, dpr)
    }

    drawOrb()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [drawOrb, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={cn("", className)}
      style={{ width: size, height: size }}
    />
  )
}
