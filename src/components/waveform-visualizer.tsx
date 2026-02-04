"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { VisualizerColors } from "@/lib/themes/types"

interface WaveformVisualizerProps {
  audioData?: Uint8Array | null
  isPlaying: boolean
  className?: string
  barCount?: number
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

export function WaveformVisualizer({
  audioData,
  isPlaying,
  className,
  barCount = 60,
  colors = defaultColors,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const smoothedDataRef = useRef<number[]>(new Array(barCount).fill(0))

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    // Guard against invalid canvas dimensions
    if (!width || !height || width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      animationRef.current = requestAnimationFrame(drawWaveform)
      return
    }

    ctx.clearRect(0, 0, width, height)

    const barWidth = width / barCount
    const gap = barWidth * 0.3
    const actualBarWidth = barWidth - gap

    for (let i = 0; i < barCount; i++) {
      let value = 0
      if (audioData && audioData.length > 0) {
        const dataIndex = Math.floor((i / barCount) * audioData.length)
        value = audioData[dataIndex] / 255
      }

      // Smooth the value
      const smoothing = 0.2
      smoothedDataRef.current[i] =
        smoothedDataRef.current[i] * (1 - smoothing) + value * smoothing

      const smoothedValue = isPlaying ? smoothedDataRef.current[i] : smoothedDataRef.current[i] * 0.95

      // Ensure minimum bar height for gradient validity
      const barHeight = Math.max(smoothedValue * height * 0.9, 1)
      const x = i * barWidth + gap / 2
      const y = (height - barHeight) / 2

      // Create gradient for each bar using theme colors
      // Ensure all coordinates are finite numbers
      const gradY1 = isFinite(y + barHeight) ? y + barHeight : 1
      const gradY2 = isFinite(y) ? y : 0
      const gradX = isFinite(x) ? x : 0
      
      // Ensure y1 !== y2 to create a valid gradient
      const safeY1 = Math.max(0, gradY1)
      const safeY2 = Math.max(0, gradY2)
      const finalY2 = safeY1 === safeY2 ? safeY1 + 1 : safeY2
      
      const gradient = ctx.createLinearGradient(gradX, safeY1, gradX, finalY2)
      gradient.addColorStop(0, hexToRgba(colors.primary, 0.8))
      gradient.addColorStop(0.5, hexToRgba(colors.secondary, 0.6))
      gradient.addColorStop(1, hexToRgba(colors.tertiary, 0.4))

      ctx.fillStyle = gradient

      // Draw rounded bar
      const radius = Math.max(actualBarWidth / 2, 0)
      ctx.beginPath()
      ctx.roundRect(x, y, actualBarWidth, barHeight, radius)
      ctx.fill()

      // Add glow effect when playing
      if (isPlaying && smoothedValue > 0.1) {
        ctx.shadowBlur = 10
        ctx.shadowColor = colors.glow
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    animationRef.current = requestAnimationFrame(drawWaveform)
  }, [audioData, isPlaying, barCount, colors])

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

    drawWaveform()

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [drawWaveform])

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
