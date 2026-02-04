"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { VisualizerColors } from "@/lib/themes/types"

interface ParticlesVisualizerProps {
  audioData?: Uint8Array | null
  isPlaying: boolean
  className?: string
  colors?: VisualizerColors
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  colorIndex: number // Use index to pick from theme colors
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

export function ParticlesVisualizer({
  audioData,
  isPlaying,
  className,
  colors = defaultColors,
}: ParticlesVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  // Create color array for particles from theme colors
  const particleColors = [colors.primary, colors.secondary, colors.tertiary, colors.highlight]

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    // Guard against invalid canvas dimensions to prevent gradient errors
    if (!width || !height || width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      animationRef.current = requestAnimationFrame(draw)
      return
    }

    // Fade effect - use a very dark version of background
    ctx.fillStyle = "rgba(10, 10, 10, 0.1)"
    ctx.fillRect(0, 0, width, height)

    // Get audio level
    let avgLevel = 0
    if (audioData && audioData.length > 0) {
      const sum = audioData.reduce((acc, val) => acc + val, 0)
      avgLevel = sum / audioData.length / 255
    }

    // Add new particles when playing
    if (isPlaying && avgLevel > 0.1 && particlesRef.current.length < 150) {
      const particlesToAdd = Math.floor(avgLevel * 5)
      for (let i = 0; i < particlesToAdd; i++) {
        const angle = Math.random() * Math.PI * 2
        const velocity = 1 + avgLevel * 3
        particlesRef.current.push({
          x: width / 2,
          y: height / 2,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: 2 + Math.random() * 3,
          alpha: 0.8 + avgLevel * 0.2,
          colorIndex: Math.floor(Math.random() * particleColors.length),
        })
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.alpha -= 0.005

      if (p.alpha <= 0) return false

      // Get particle color from theme
      const particleColor = particleColors[p.colorIndex]

      // Draw particle
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(particleColor, p.alpha)
      ctx.fill()

      // Glow
      if (p.alpha > 0.5) {
        ctx.shadowBlur = 10
        ctx.shadowColor = hexToRgba(particleColor, 0.5)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      return true
    })

    // Draw center pulse using primary color
    // Ensure minimum radius for valid gradient
    const pulseRadius = Math.max(30 + avgLevel * 50, 1)
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      pulseRadius
    )
    gradient.addColorStop(0, hexToRgba(colors.primary, avgLevel * 0.5))
    gradient.addColorStop(1, hexToRgba(colors.primary, 0))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, pulseRadius, 0, Math.PI * 2)
    ctx.fill()

    animationRef.current = requestAnimationFrame(draw)
  }, [audioData, isPlaying, colors, particleColors])

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
