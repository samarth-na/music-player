"use client"

import { Keyboard, ArrowLeft, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface KeyboardShortcut {
  key: string
  description: string
  category: string
}

const shortcuts: KeyboardShortcut[] = [
  // Playback
  { key: "Space", description: "Play or pause the current track", category: "Playback" },
  { key: "→ (Right Arrow)", description: "Skip to next track", category: "Playback" },
  { key: "← (Left Arrow)", description: "Go to previous track", category: "Playback" },
  
  // Volume
  { key: "↑ (Up Arrow)", description: "Increase volume by 10%", category: "Volume" },
  { key: "↓ (Down Arrow)", description: "Decrease volume by 10%", category: "Volume" },
  { key: "M", description: "Toggle mute on/off", category: "Volume" },
  
  // Settings
  { key: "S", description: "Toggle shuffle mode", category: "Settings" },
  { key: "R", description: "Toggle repeat mode", category: "Settings" },
  
  // Playlist
  { key: "L", description: "Like/unlike current track", category: "Playlist" },
  
  // Navigation
  { key: "Ctrl/⌘ + F", description: "Focus search input", category: "Navigation" },
  { key: "Esc", description: "Clear search / Close help", category: "Navigation" },
  
  // Help
  { key: "?", description: "Show or hide keyboard shortcuts help", category: "Help" },
]

const categories = ["Playback", "Volume", "Settings", "Playlist", "Navigation", "Help"]

export default function ShortcutsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Player</span>
          </Link>
          <div className="flex items-center gap-2 text-white/60">
            <Music className="w-5 h-5" />
            <span className="text-sm font-medium">ElevenMusic</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 mb-4">
            <Keyboard className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Keyboard Shortcuts</h1>
          <p className="text-white/50">
            Master your music with these keyboard combinations
          </p>
        </div>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === category)
            if (categoryShortcuts.length === 0) return null

            return (
              <div
                key={category}
                className="bg-[#141414] rounded-xl border border-white/10 p-6"
              >
                <h2 className="text-sm font-medium text-indigo-400 uppercase tracking-wider mb-4">
                  {category}
                </h2>
                <div className="space-y-3">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-start justify-between gap-4"
                    >
                      <span className="text-white/70 text-sm pt-1">
                        {shortcut.description}
                      </span>
                      <kbd
                        className={cn(
                          "px-3 py-1.5 text-xs font-mono rounded-lg whitespace-nowrap",
                          "bg-white/10 text-white border border-white/20",
                          "shadow-sm"
                        )}
                      >
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-3">Pro Tips</h3>
          <ul className="space-y-2 text-white/60 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/80">?</kbd> anytime in the player to show the quick help dialog</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Keyboard shortcuts work even when the player is not focused (global shortcuts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Volume changes show a visual indicator so you know the exact level</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400">•</span>
              <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/80">Ctrl/⌘ + F</kbd> to quickly find tracks in your playlist</span>
            </li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link href="/">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Player
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-white/40 text-sm">
          ElevenMusic Player • Built with ElevenLabs UI
        </div>
      </footer>
    </div>
  )
}
