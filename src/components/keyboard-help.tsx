"use client"

import { Keyboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface KeyboardShortcut {
  key: string
  description: string
  category: string
  modifiers?: string[]
}

const shortcuts: KeyboardShortcut[] = [
  // Playback
  { key: "Space", description: "Play/Pause", category: "Playback" },
  { key: "→", description: "Next track", category: "Playback" },
  { key: "←", description: "Previous track", category: "Playback" },
  
  // Volume
  { key: "↑", description: "Volume up", category: "Volume" },
  { key: "↓", description: "Volume down", category: "Volume" },
  { key: "M", description: "Mute toggle", category: "Volume" },
  
  // Settings
  { key: "S", description: "Shuffle toggle", category: "Settings" },
  { key: "R", description: "Repeat toggle", category: "Settings" },
  
  // Playlist
  { key: "L", description: "Like current track", category: "Playlist" },
  
  // Navigation
  { key: "Ctrl/⌘ + F", description: "Focus search", category: "Navigation" },
  { key: "Esc", description: "Clear search / Close help", category: "Navigation" },
  
  // Help
  { key: "?", description: "Show/hide keyboard shortcuts", category: "Help" },
]

const categories = ["Playback", "Volume", "Settings", "Playlist", "Navigation", "Help"]

interface KeyboardHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardHelp({ open, onOpenChange }: KeyboardHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#141414] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Press any key combination to perform an action
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {categories.map((category) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === category)
            if (categoryShortcuts.length === 0) return null

            return (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  {category}
                </h3>
                <div className="space-y-1">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={`${shortcut.key}-${shortcut.description}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-white/5"
                    >
                      <span className="text-sm text-white/70">{shortcut.description}</span>
                      <kbd className={cn(
                        "px-2 py-0.5 text-xs font-mono rounded",
                        "bg-white/10 text-white/90 border border-white/10"
                      )}>
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            Tip: Press <kbd className="px-1.5 py-0.5 text-xs rounded bg-white/10 border border-white/10">?</kbd> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
