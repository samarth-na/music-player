"use client"

import { useEffect, useCallback, useState } from "react"

interface ShortcutConfig {
  key: string
  action: () => void
  description: string
  category: "Playback" | "Volume" | "Navigation" | "Playlist" | "Settings" | "Help"
  modifiers?: string[]
  preventDefault?: boolean
}

export interface UseKeyboardShortcutsOptions {
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onVolumeUp: () => void
  onVolumeDown: () => void
  onMuteToggle: () => void
  onShuffleToggle: () => void
  onRepeatToggle: () => void
  onLikeToggle: () => void
  onFocusSearch: () => void
  onClearSearch: () => void
  onShowHelp: () => void
  onHideHelp: () => void
  isSearchFocused: boolean
  isHelpOpen: boolean
  hasCurrentTrack: boolean
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const [showToast, setShowToast] = useState<{ message: string; visible: boolean }>({ 
    message: "", 
    visible: false 
  })

  const showShortcutToast = useCallback((message: string) => {
    setShowToast({ message, visible: true })
    setTimeout(() => {
      setShowToast(prev => ({ ...prev, visible: false }))
    }, 1500)
  }, [])

  const shortcuts: ShortcutConfig[] = [
    {
      key: " ",
      action: () => {
        if (options.hasCurrentTrack) {
          options.onPlayPause()
          showShortcutToast(options.isHelpOpen ? "?" : "▶ Play/Pause")
        }
      },
      description: "Play/Pause",
      category: "Playback",
      preventDefault: true,
    },
    {
      key: "ArrowRight",
      action: () => {
        options.onNext()
        showShortcutToast("→ Next Track")
      },
      description: "Next track",
      category: "Playback",
    },
    {
      key: "ArrowLeft",
      action: () => {
        options.onPrevious()
        showShortcutToast("← Previous Track")
      },
      description: "Previous track",
      category: "Playback",
    },
    {
      key: "ArrowUp",
      action: () => {
        options.onVolumeUp()
        showShortcutToast("↑ Volume Up")
      },
      description: "Volume up",
      category: "Volume",
    },
    {
      key: "ArrowDown",
      action: () => {
        options.onVolumeDown()
        showShortcutToast("↓ Volume Down")
      },
      description: "Volume down",
      category: "Volume",
    },
    {
      key: "m",
      action: () => {
        options.onMuteToggle()
        showShortcutToast("M Mute")
      },
      description: "Mute toggle",
      category: "Volume",
    },
    {
      key: "s",
      action: () => {
        options.onShuffleToggle()
        showShortcutToast("S Shuffle")
      },
      description: "Shuffle toggle",
      category: "Settings",
    },
    {
      key: "r",
      action: () => {
        options.onRepeatToggle()
        showShortcutToast("R Repeat")
      },
      description: "Repeat toggle",
      category: "Settings",
    },
    {
      key: "l",
      action: () => {
        if (options.hasCurrentTrack) {
          options.onLikeToggle()
          showShortcutToast("L Like")
        }
      },
      description: "Like current track",
      category: "Playlist",
    },
    {
      key: "f",
      modifiers: ["ctrl", "meta"],
      action: () => {
        options.onFocusSearch()
        showShortcutToast("⌘F Search")
      },
      description: "Focus search",
      category: "Navigation",
      preventDefault: true,
    },
    {
      key: "Escape",
      action: () => {
        if (options.isHelpOpen) {
          options.onHideHelp()
        } else if (!options.isSearchFocused) {
          options.onClearSearch()
        }
      },
      description: "Clear search / Close help",
      category: "Navigation",
    },
    {
      key: "?",
      action: () => {
        if (!options.isHelpOpen) {
          options.onShowHelp()
        } else {
          options.onHideHelp()
        }
      },
      description: "Show/hide keyboard shortcuts",
      category: "Help",
    },
  ]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields (except for Escape and ?)
      const target = event.target as HTMLElement
      const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      
      if (isInputField && !options.isHelpOpen) {
        // Allow Escape to clear search, ? to show help, and Ctrl/Cmd+F to focus search
        if (event.key !== "Escape" && event.key !== "?" && !(event.key === "f" && (event.ctrlKey || event.metaKey))) {
          return
        }
      }

      // Find matching shortcut
      const shortcut = shortcuts.find(s => {
        if (s.key !== event.key) return false
        
        // Check modifiers
        if (s.modifiers) {
          const hasCtrl = s.modifiers.includes("ctrl") && event.ctrlKey
          const hasMeta = s.modifiers.includes("meta") && event.metaKey
          const needsModifier = s.modifiers.some(m => m === "ctrl" || m === "meta")
          
          if (needsModifier && !hasCtrl && !hasMeta) return false
          if (!needsModifier && (event.ctrlKey || event.metaKey)) return false
        } else if (event.ctrlKey || event.metaKey || event.altKey) {
          // If no modifiers specified, don't trigger if any modifier is pressed
          return false
        }
        
        return true
      })

      if (shortcut) {
        if (shortcut.preventDefault) {
          event.preventDefault()
        }
        shortcut.action()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts, options])

  return { showToast, shortcuts }
}

export const shortcutCategories = [
  "Playback",
  "Volume", 
  "Navigation",
  "Playlist",
  "Settings",
  "Help",
] as const

export type ShortcutCategory = (typeof shortcutCategories)[number]
