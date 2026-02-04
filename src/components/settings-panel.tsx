"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  Settings, 
  LayoutGrid, 
  Palette, 
  Waves, 
  Circle, 
  Sparkles, 
  Activity, 
  Check,
  Maximize2,
  Minimize2,
  Monitor
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { themeList } from "@/lib/themes/presets"
import { ThemeId } from "@/lib/themes/types"

export type VisualizerType = "waveform" | "circular" | "rings" | "particles"
export type LayoutType = "default" | "compact" | "theater" | "vertical" | "split"

interface SettingsPanelProps {
  currentVisualizer: VisualizerType
  onVisualizerChange: (type: VisualizerType) => void
  currentLayout: LayoutType
  onLayoutChange: (layout: LayoutType) => void
  className?: string
}

const visualizers = [
  { id: "waveform" as VisualizerType, label: "Waveform", icon: Waves, description: "Classic audio bars" },
  { id: "circular" as VisualizerType, label: "Circular", icon: Circle, description: "Radial frequency display" },
  { id: "rings" as VisualizerType, label: "Frequency Rings", icon: Activity, description: "Rotating ring waves" },
  { id: "particles" as VisualizerType, label: "Particles", icon: Sparkles, description: "Reactive particle system" },
]

const layouts = [
  { id: "default" as LayoutType, label: "Default", icon: Monitor, description: "Sidebar + Player + Visualizer" },
  { id: "compact" as LayoutType, label: "Compact", icon: Minimize2, description: "Minimal controls only" },
  { id: "theater" as LayoutType, label: "Theater", icon: Maximize2, description: "Fullscreen visualizer" },
  { id: "vertical" as LayoutType, label: "Vertical", icon: LayoutGrid, description: "Stacked vertically" },
  { id: "split" as LayoutType, label: "Split", icon: LayoutGrid, description: "Playlist + Player side by side" },
]

// Visualizer preset options
const visualizerPresetOptions = [
  { id: "indigo", label: "Indigo", color: "#6366f1" },
  { id: "neon", label: "Neon", color: "#00ffff" },
  { id: "monochrome", label: "Mono", color: "#ffffff" },
  { id: "sunset", label: "Sunset", color: "#ff6b6b" },
  { id: "forest", label: "Forest", color: "#10b981" },
  { id: "ocean", label: "Ocean", color: "#0ea5e9" },
]

// Theme color swatches for visual preview
const themeSwatches: Record<ThemeId, string> = {
  dark: "#7c3aed",
  light: "#d97706",
  neon: "#ff00ff",
  minimal: "#000000",
  sunset: "#ff4500",
  forest: "#00a86b",
}

export function SettingsPanel({
  currentVisualizer,
  onVisualizerChange,
  currentLayout,
  onLayoutChange,
  className,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"visualizer" | "theme" | "layout">("visualizer")
  const { theme, setTheme, visualizerPreset, setVisualizerPreset } = useTheme()

  return (
    <div className={cn("relative", className)}>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all",
          isOpen && "bg-muted/50 text-foreground"
        )}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel - positioned to stay within viewport */}
          <div className="fixed right-4 top-16 w-80 max-h-[calc(100vh-5rem)] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Settings</h3>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              {[
                { id: "visualizer", label: "Visualizer", icon: Waves },
                { id: "theme", label: "Theme", icon: Palette },
                { id: "layout", label: "Layout", icon: LayoutGrid },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all",
                    activeTab === tab.id
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content - scrollable */}
            <div className="p-5 overflow-y-auto flex-1">
              {/* Visualizer Options */}
              {activeTab === "visualizer" && (
                <div className="space-y-5">
                  {/* Visualizer Type */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Style</p>
                    <div className="space-y-1.5">
                      {visualizers.map((viz) => (
                        <button
                          key={viz.id}
                          onClick={() => onVisualizerChange(viz.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                            currentVisualizer === viz.id
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <viz.icon className="w-4 h-4 flex-shrink-0" />
                          <div className="flex flex-col items-start text-left">
                            <span className="font-medium">{viz.label}</span>
                            <span className="text-xs opacity-60">{viz.description}</span>
                          </div>
                          {currentVisualizer === viz.id && (
                            <Check className="ml-auto w-4 h-4 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visualizer Color Preset */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Colors</p>
                    <div className="grid grid-cols-3 gap-2">
                      {visualizerPresetOptions.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setVisualizerPreset(preset.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg text-xs transition-all",
                            visualizerPreset === preset.id
                              ? "bg-primary/20 border border-primary/30"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                        >
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
                            style={{ 
                              backgroundColor: preset.color,
                              boxShadow: visualizerPreset === preset.id ? `0 0 12px ${preset.color}` : 'none'
                            }}
                          />
                          <span className={cn(
                            "font-medium",
                            visualizerPreset === preset.id ? "text-foreground" : "text-muted-foreground"
                          )}>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Theme Options */}
              {activeTab === "theme" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">UI Theme</p>
                  <div className="space-y-1.5">
                    {themeList.map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => setTheme(themeOption.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                          theme === themeOption.id
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {/* Color swatch */}
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0 shadow-lg"
                          style={{ 
                            backgroundColor: themeSwatches[themeOption.id],
                            boxShadow: theme === themeOption.id ? `0 0 12px ${themeSwatches[themeOption.id]}` : 'none'
                          }}
                        />
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{themeOption.name}</span>
                          <span className="text-xs opacity-60">{themeOption.description}</span>
                        </div>
                        {theme === themeOption.id && (
                          <Check className="ml-auto w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Layout Options */}
              {activeTab === "layout" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Player Layout</p>
                  <div className="space-y-1.5">
                    {layouts.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => onLayoutChange(layout.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                          currentLayout === layout.id
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <layout.icon className="w-4 h-4 flex-shrink-0" />
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{layout.label}</span>
                          <span className="text-xs opacity-60">{layout.description}</span>
                        </div>
                        {currentLayout === layout.id && (
                          <Check className="ml-auto w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
