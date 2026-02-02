"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface WaveformVisualizerProps {
  audioData?: Uint8Array | null
  isPlaying: boolean
  className?: string
  barCount?: number
}

export function WaveformVisualizer({
  audioData,
  isPlaying,
  className,
  barCount = 60,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const smoothedDataRef = useRef<number[]>(new Array(barCount).fill(0))

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width / (window.devicePixelRatio || 1)
    const height = canvas.height / (window.devicePixelRatio || 1)

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

      const barHeight = smoothedValue * height * 0.9
      const x = i * barWidth + gap / 2
      const y = (height - barHeight) / 2

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y + barHeight, x, y)
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.8)")
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.6)")
      gradient.addColorStop(1, "rgba(168, 85, 247, 0.4)")

      ctx.fillStyle = gradient

      // Draw rounded bar
      const radius = actualBarWidth / 2
      ctx.beginPath()
      ctx.roundRect(x, y, actualBarWidth, barHeight, radius)
      ctx.fill()

      // Add glow effect when playing
      if (isPlaying && smoothedValue > 0.1) {
        ctx.shadowBlur = 10
        ctx.shadowColor = "rgba(139, 92, 246, 0.6)"
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    animationRef.current = requestAnimationFrame(drawWaveform)
  }, [audioData, isPlaying, barCount])

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
