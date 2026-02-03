"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { VisualizerColors } from "@/lib/themes/types"

interface FrequencyRingVisualizerProps {
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

// Helper to parse color and get HSL values for ring variations
function getColorVariation(baseColor: string, ringIndex: number): { stroke: string; glow: string } {
  // For simplicity, we'll use the baseColor with adjusted alpha
  const alpha = 0.6 - ringIndex * 0.1
  const glowAlpha = 0.5
  
  if (baseColor.startsWith("#")) {
    const hex = baseColor.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return {
      stroke: `rgba(${r}, ${g}, ${b}, ${alpha})`,
      glow: `rgba(${r}, ${g}, ${b}, ${glowAlpha})`,
    }
  }
  
  return { stroke: baseColor, glow: baseColor }
}

export function FrequencyRingVisualizer({
  audioData,
  isPlaying,
  className,
  colors = defaultColors,
}: FrequencyRingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const rotationRef = useRef(0)

  // Create color array for rings from theme colors
  const ringColors = [colors.primary, colors.secondary, colors.tertiary, colors.highlight]

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width / (window.devicePixelRatio || 1)
    const height = canvas.height / (window.devicePixelRatio || 1)
    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = Math.min(width, height) / 3

    ctx.clearRect(0, 0, width, height)

    // Get audio data
    let values: number[] = []
    if (audioData && audioData.length > 0) {
      const samples = 128
      for (let i = 0; i < samples; i++) {
        const idx = Math.floor((i / samples) * audioData.length)
        values.push(audioData[idx] / 255)
      }
    } else {
      values = new Array(128).fill(0)
    }

    if (isPlaying) {
      rotationRef.current += 0.005
    }

    const rings = 4
    const ringStep = baseRadius / rings

    // Draw multiple rings
    for (let ring = 0; ring < rings; ring++) {
      const ringRadius = ringStep * (ring + 1)
      const points = 64 + ring * 32

      ctx.beginPath()

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + rotationRef.current * (ring % 2 === 0 ? 1 : -1)
        const dataIdx = Math.floor((i / points) * values.length) % values.length
        const value = isPlaying ? values[dataIdx] : values[dataIdx] * 0.95

        const r = ringRadius + value * ringStep * 0.5
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.closePath()

      // Ring color based on theme colors
      const { stroke, glow } = getColorVariation(ringColors[ring % ringColors.length], ring)
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.stroke()

      // Glow for active rings
      if (isPlaying) {
        ctx.shadowBlur = 10
        ctx.shadowColor = glow
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    animationRef.current = requestAnimationFrame(draw)
  }, [audioData, isPlaying, ringColors])

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
