"use client"

import { Check, Moon, Sun, Sparkles, CircleDot, Sunset, TreeDeciduous } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { themeList } from "@/lib/themes/presets"
import { ThemeId } from "@/lib/themes/types"

// Icon mapping for each theme
const themeIcons: Record<ThemeId, React.ComponentType<{ className?: string }>> = {
  dark: Moon,
  light: Sun,
  neon: Sparkles,
  minimal: CircleDot,
  sunset: Sunset,
  forest: TreeDeciduous,
}

// Primary color swatch for visual preview
const themeSwatches: Record<ThemeId, string> = {
  dark: "#6366f1",
  light: "#4f46e5",
  neon: "#00ffff",
  minimal: "#ffffff",
  sunset: "#ff6b6b",
  forest: "#10b981",
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, isDark } = useTheme()
  const CurrentIcon = themeIcons[theme] || Moon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn("rounded-full hover:bg-white/10", className)}
        >
          <CurrentIcon className="h-5 w-5 text-foreground" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themeList.map((themeOption) => {
          const Icon = themeIcons[themeOption.id]
          const isActive = theme === themeOption.id
          
          return (
            <DropdownMenuItem
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              {/* Color swatch */}
              <div 
                className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                style={{ backgroundColor: themeSwatches[themeOption.id] }}
              />
              
              {/* Icon */}
              <Icon className="h-4 w-4 flex-shrink-0" />
              
              {/* Theme name */}
              <span className="flex-1">{themeOption.name}</span>
              
              {/* Check mark for active theme */}
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
