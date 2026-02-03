"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { ThemeId, VisualizerColors } from "@/lib/themes/types"
import { getTheme, getVisualizerPreset, visualizerPresets } from "@/lib/themes/presets"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ThemeId
  storageKey?: string
}

type ThemeProviderState = {
  theme: ThemeId
  visualizerPreset: string
  visualizerColors: VisualizerColors
  setTheme: (theme: ThemeId) => void
  setVisualizerPreset: (presetId: string) => void
  isDark: boolean
}

const initialState: ThemeProviderState = {
  theme: "dark",
  visualizerPreset: "indigo",
  visualizerColors: visualizerPresets.indigo,
  setTheme: () => null,
  setVisualizerPreset: () => null,
  isDark: true,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

// All theme class names to remove when switching
const themeClasses = ["dark", "light", "neon", "minimal", "sunset", "forest"] as const

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "elevenmusic-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme)
  const [visualizerPreset, setVisualizerPresetState] = useState<string>("indigo")
  const [mounted, setMounted] = useState(false)

  // Initialize from localStorage
  useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem(storageKey) as ThemeId | null
    const storedVisualizerPreset = localStorage.getItem(`${storageKey}-visualizer`)
    
    if (storedTheme && themeClasses.includes(storedTheme as typeof themeClasses[number])) {
      setThemeState(storedTheme)
    }
    if (storedVisualizerPreset && visualizerPresets[storedVisualizerPreset]) {
      setVisualizerPresetState(storedVisualizerPreset)
    }
  }, [storageKey])

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    
    // Remove all theme classes
    themeClasses.forEach((cls) => root.classList.remove(cls))
    
    // Add current theme class
    root.classList.add(theme)
  }, [theme, mounted])

  const setTheme = useCallback((newTheme: ThemeId) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
    // Theme and visualizer colors are now independent - no auto-sync
  }, [storageKey])

  const setVisualizerPreset = useCallback((presetId: string) => {
    if (visualizerPresets[presetId]) {
      localStorage.setItem(`${storageKey}-visualizer`, presetId)
      setVisualizerPresetState(presetId)
    }
  }, [storageKey])

  const themeDefinition = getTheme(theme)
  const visualizerColors = getVisualizerPreset(visualizerPreset)

  const value: ThemeProviderState = {
    theme,
    visualizerPreset,
    visualizerColors,
    setTheme,
    setVisualizerPreset,
    isDark: themeDefinition.isDark,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

// Export visualizer presets for UI components
export { visualizerPresets }
