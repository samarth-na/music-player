"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { VisualizerColors } from "@/lib/themes/types"

interface CircularVisualizerProps {
  audioData?: Uint8Array | null
  isPlaying: boolean
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

export function CircularVisualizer({
  audioData,
  isPlaying,
  className,
  colors = defaultColors,
}: CircularVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    
    // Guard against invalid canvas dimensions
    if (!width || !height || width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      animationRef.current = requestAnimationFrame(draw)
      return
    }
    
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.max(Math.min(width, height) / 2 - 20, 1)

    ctx.clearRect(0, 0, width, height)

    // Get audio data
    let values: number[] = []
    if (audioData && audioData.length > 0) {
      const samples = 64
      for (let i = 0; i < samples; i++) {
        const idx = Math.floor((i / samples) * audioData.length)
        values.push(audioData[idx] / 255)
      }
    } else {
      values = new Array(64).fill(0)
    }

    const bars = values.length
    const angleStep = (Math.PI * 2) / bars

    // Draw circular bars
    for (let i = 0; i < bars; i++) {
      const value = isPlaying ? values[i] : values[i] * 0.95
      // Ensure minimum bar height for gradient validity
      const barHeight = Math.max(value * radius * 0.8, 1)
      const angle = i * angleStep - Math.PI / 2

      const innerRadius = radius * 0.2
      const x1 = centerX + Math.cos(angle) * innerRadius
      const y1 = centerY + Math.sin(angle) * innerRadius
      const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight)
      const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight)

      // Create gradient using theme colors - ensure valid coordinates
      const dx = x2 - x1
      const dy = y2 - y1
      const dist = Math.sqrt(dx * dx + dy * dy)
      // If points are too close, offset slightly to avoid invalid gradient
      const safeX2 = dist < 1 ? x1 + 1 : x2
      const safeY2 = dist < 1 ? y1 + 1 : y2
      const gradient = ctx.createLinearGradient(x1, y1, safeX2, safeY2)
      gradient.addColorStop(0, hexToRgba(colors.primary, 0.8))
      gradient.addColorStop(0.5, hexToRgba(colors.secondary, 0.6))
      gradient.addColorStop(1, hexToRgba(colors.highlight, 0.4))

      ctx.strokeStyle = gradient
      ctx.lineWidth = 3
      ctx.lineCap = "round"

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Glow effect
      if (isPlaying && value > 0.3) {
        ctx.shadowBlur = 15
        ctx.shadowColor = colors.glow
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = isPlaying 
      ? hexToRgba(colors.primary, 0.3) 
      : hexToRgba(colors.primary, 0.1)
    ctx.fill()

    animationRef.current = requestAnimationFrame(draw)
  }, [audioData, isPlaying, colors])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    draw()

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
    />
  )
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
