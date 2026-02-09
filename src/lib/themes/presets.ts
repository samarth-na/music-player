// Theme presets - light and dark themes with UI and visualizer colors

import { ThemeDefinition, VisualizerColors } from "./types"

// Visualizer color presets (can be used independently of UI themes)
export const visualizerPresets: Record<string, VisualizerColors> = {
  indigo: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    tertiary: "#a855f7",
    glow: "rgba(139, 92, 246, 0.6)",
    background: "rgba(99, 102, 241, 0.1)",
    highlight: "#ec4899",
  },
  neon: {
    primary: "#00ffff",
    secondary: "#ff00ff",
    tertiary: "#00ff88",
    glow: "rgba(0, 255, 255, 0.6)",
    background: "rgba(255, 0, 255, 0.1)",
    highlight: "#ffff00",
  },
  monochrome: {
    primary: "#ffffff",
    secondary: "#a3a3a3",
    tertiary: "#737373",
    glow: "rgba(255, 255, 255, 0.4)",
    background: "rgba(255, 255, 255, 0.05)",
    highlight: "#e5e5e5",
  },
  sunset: {
    primary: "#ff6b6b",
    secondary: "#ffa500",
    tertiary: "#ffd700",
    glow: "rgba(255, 165, 0, 0.6)",
    background: "rgba(255, 107, 107, 0.1)",
    highlight: "#ff8c00",
  },
  forest: {
    primary: "#10b981",
    secondary: "#14b8a6",
    tertiary: "#84cc16",
    glow: "rgba(16, 185, 129, 0.6)",
    background: "rgba(20, 184, 166, 0.1)",
    highlight: "#22d3ee",
  },
  ocean: {
    primary: "#0ea5e9",
    secondary: "#3b82f6",
    tertiary: "#6366f1",
    glow: "rgba(59, 130, 246, 0.6)",
    background: "rgba(14, 165, 233, 0.1)",
    highlight: "#06b6d4",
  },
}

// Dark theme (default)
export const darkTheme: ThemeDefinition = {
  id: "dark",
  name: "Dark",
  description: "Default dark theme",
  isDark: true,
  colors: {
    background: "oklch(0.14 0 0)",
    foreground: "oklch(0.99 0 0)",
    card: "oklch(0.20 0 0)",
    cardForeground: "oklch(0.99 0 0)",
    popover: "oklch(0.20 0 0)",
    popoverForeground: "oklch(0.99 0 0)",
    primary: "oklch(0.92 0 0)",
    primaryForeground: "oklch(0.20 0 0)",
    secondary: "oklch(0.27 0 0)",
    secondaryForeground: "oklch(0.99 0 0)",
    muted: "oklch(0.27 0 0)",
    mutedForeground: "oklch(0.71 0 0)",
    accent: "oklch(0.27 0 0)",
    accentForeground: "oklch(0.99 0 0)",
    destructive: "oklch(0.70 0.19 22.23)",
    border: "oklch(1.00 0 0 / 10%)",
    input: "oklch(1.00 0 0 / 15%)",
    ring: "oklch(0.56 0 0)",
    chart1: "oklch(0.49 0.24 264.40)",
    chart2: "oklch(0.70 0.16 160.43)",
    chart3: "oklch(0.77 0.17 65.36)",
    chart4: "oklch(0.62 0.26 305.32)",
    chart5: "oklch(0.64 0.25 16.51)",
    sidebar: "oklch(0.20 0 0)",
    sidebarForeground: "oklch(0.99 0 0)",
    sidebarPrimary: "oklch(0.49 0.24 264.40)",
    sidebarPrimaryForeground: "oklch(0.99 0 0)",
    sidebarAccent: "oklch(0.27 0 0)",
    sidebarAccentForeground: "oklch(0.99 0 0)",
    sidebarBorder: "oklch(1.00 0 0 / 10%)",
    sidebarRing: "oklch(0.56 0 0)",
  },
  visualizer: visualizerPresets.indigo,
}

// Light theme
export const lightTheme: ThemeDefinition = {
  id: "light",
  name: "Light",
  description: "Clean light theme",
  isDark: false,
  colors: {
    background: "oklch(1.00 0 0)",
    foreground: "oklch(0.14 0 0)",
    card: "oklch(1.00 0 0)",
    cardForeground: "oklch(0.14 0 0)",
    popover: "oklch(1.00 0 0)",
    popoverForeground: "oklch(0.14 0 0)",
    primary: "oklch(0.20 0 0)",
    primaryForeground: "oklch(0.99 0 0)",
    secondary: "oklch(0.97 0 0)",
    secondaryForeground: "oklch(0.20 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.56 0 0)",
    accent: "oklch(0.97 0 0)",
    accentForeground: "oklch(0.20 0 0)",
    destructive: "oklch(0.58 0.24 28.48)",
    border: "oklch(0.92 0 0)",
    input: "oklch(0.92 0 0)",
    ring: "oklch(0.71 0 0)",
    chart1: "oklch(0.65 0.22 36.85)",
    chart2: "oklch(0.60 0.11 184.15)",
    chart3: "oklch(0.40 0.07 227.18)",
    chart4: "oklch(0.83 0.17 81.03)",
    chart5: "oklch(0.77 0.17 65.36)",
    sidebar: "oklch(0.99 0 0)",
    sidebarForeground: "oklch(0.14 0 0)",
    sidebarPrimary: "oklch(0.20 0 0)",
    sidebarPrimaryForeground: "oklch(0.99 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    sidebarAccentForeground: "oklch(0.20 0 0)",
    sidebarBorder: "oklch(0.92 0 0)",
    sidebarRing: "oklch(0.708 0 0)",
  },
  visualizer: visualizerPresets.indigo,
}

// All themes registry
export const themes: Record<string, ThemeDefinition> = {
  dark: darkTheme,
  light: lightTheme,
}

// Theme list for UI
export const themeList: ThemeDefinition[] = [
  darkTheme,
  lightTheme,
]

// Get theme by ID with fallback
export function getTheme(id: string): ThemeDefinition {
  return themes[id] || darkTheme
}

// Get visualizer preset by ID
export function getVisualizerPreset(id: string): VisualizerColors {
  return visualizerPresets[id] || visualizerPresets.indigo
}
