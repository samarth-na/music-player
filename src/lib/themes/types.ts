// Theme system types

export type ThemeId = "dark" | "light" | "neon" | "minimal" | "sunset" | "forest"

export interface VisualizerColors {
  // Primary gradient colors (used for bars, rings, etc.)
  primary: string
  secondary: string
  tertiary: string
  
  // Glow/accent color
  glow: string
  
  // Background elements
  background: string
  
  // Particle/highlight color
  highlight: string
}

export interface ThemeColors {
  // UI Colors
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  ring: string
  
  // Chart/Visualization colors
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  
  // Sidebar colors
  sidebar: string
  sidebarForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarBorder: string
  sidebarRing: string
}

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  isDark: boolean
  colors: ThemeColors
  visualizer: VisualizerColors
}

export interface VisualizerThemePreset {
  id: string
  name: string
  colors: VisualizerColors
}

// Theme context state
export interface ThemeState {
  theme: ThemeId
  visualizerColors: VisualizerColors
  setTheme: (theme: ThemeId) => void
  setVisualizerColors: (colors: VisualizerColors) => void
}
