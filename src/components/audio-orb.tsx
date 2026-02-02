"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface AudioOrbProps {
  isPlaying: boolean
  audioData?: Uint8Array | null
  size?: number
  className?: string
}

export function AudioOrb({ 
  isPlaying, 
  audioData, 
  size = 300, 
  className 
}: AudioOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const rotationRef = useRef(0)

  const drawOrb = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = (size / 2) * 0.8

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

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

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    )

    if (isPlaying) {
      const intensity = 0.3 + avgLevel * 0.7
      gradient.addColorStop(0, `rgba(99, 102, 241, ${intensity})`)
      gradient.addColorStop(0.5, `rgba(139, 92, 246, ${intensity * 0.8})`)
      gradient.addColorStop(1, `rgba(168, 85, 247, ${intensity * 0.6})`)
    } else {
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.3)")
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.2)")
      gradient.addColorStop(1, "rgba(168, 85, 247, 0.1)")
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

      // Add glow effect
      if (isPlaying) {
        ctx.shadowBlur = 20 + avgLevel * 30
        ctx.shadowColor = "rgba(139, 92, 246, 0.5)"
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
  }, [isPlaying, audioData, size])

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
