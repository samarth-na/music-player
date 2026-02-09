"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  FolderOpen,
  Music,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  ListMusic,
  Heart,
  Search,
  X,
  Download,
  Upload,
  Keyboard,
  BarChart3,
  PlayCircle,
  Menu,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/components/theme-provider"
import { AudioOrb } from "@/components/audio-orb"
import { WaveformVisualizer } from "@/components/waveform-visualizer"
import { CircularVisualizer } from "@/components/circular-visualizer"
import { FrequencyRingVisualizer } from "@/components/frequency-ring-visualizer"
import { ParticlesVisualizer } from "@/components/particles-visualizer"
import { SettingsPanel, VisualizerType } from "@/components/settings-panel"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AudioFile, TrackStats, FolderData } from "@/lib/persistence"
import { usePersistence } from "@/lib/persistence/hooks"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardHelp } from "@/components/keyboard-help"

export function MusicPlayer() {
  const [files, setFiles] = useState<AudioFile[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [folderName, setFolderName] = useState<string>("")
  const [audioData, setAudioData] = useState<Uint8Array | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showOnlyLiked, setShowOnlyLiked] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [trackStats, setTrackStats] = useState<Record<string, TrackStats>>({})
  const [showStats, setShowStats] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Visualizer state
  const [currentVisualizer, setCurrentVisualizer] = useState<VisualizerType>("waveform")
  
  // Sidebar state (for mobile drawer)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Theater mode (hides sidebar on desktop for immersive view)
  const [isTheaterMode, setIsTheaterMode] = useState(false)
  
  // Get visualizer colors from theme context
  const { visualizerColors } = useTheme()
   
  const audioRef = useRef<HTMLAudioElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const playStartTimeRef = useRef<number>(0)

  const persistence = usePersistence()

  // Initialize audio context and analyser
  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    
    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    
    audioContextRef.current = audioContext
    analyserRef.current = analyser
  }, [])

  // Update visualizer data
  const updateVisualizer = useCallback(() => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    setAudioData(dataArray)
    animationRef.current = requestAnimationFrame(updateVisualizer)
  }, [])

  // Load track stats
  const loadTrackStats = useCallback(async () => {
    if (folderName === "" || files.length === 0) return
    const stats = await persistence.getTrackStats(folderName, files)
    setTrackStats(stats)
  }, [folderName, files, persistence])

  // Apply persisted data to state
  const applyPersistedData = useCallback((data: Partial<FolderData>, audioFiles: AudioFile[]) => {
    const likedNames = new Set(data.favorites || [])
    const filesWithLikes = audioFiles.map(file => ({
      ...file,
      liked: likedNames.has(file.name)
    }))
    setFiles(filesWithLikes)

    if (data.trackStats) {
      setTrackStats(data.trackStats)
    }

    if (data.lastPlayedTrackIndex !== undefined && data.lastPlayedTrackIndex >= 0) {
      setCurrentIndex(data.lastPlayedTrackIndex)
    } else if (audioFiles.length > 0) {
      setCurrentIndex(0)
    }

    if (data.volume !== undefined) {
      const newVolume = data.volume
      setVolume(newVolume)
      if (audioRef.current) {
        audioRef.current.volume = newVolume
      }
    }

    if (data.isShuffle !== undefined) {
      setIsShuffle(data.isShuffle)
    }

    if (data.isRepeat !== undefined) {
      setIsRepeat(data.isRepeat)
    }
  }, [])

  // Load persisted data from JSON file
  const loadFromJsonFile = useCallback(async (filesList: FileList, audioFiles: AudioFile[]) => {
    const jsonFile = Array.from(filesList).find(f => f.name === '.elevenmusic.json')
    if (!jsonFile) return null

    try {
      const text = await jsonFile.text()
      const data = await persistence.importFolderData(text, audioFiles)
      return data
    } catch (error) {
      console.error('Failed to load JSON file:', error)
      return null
    }
  }, [persistence])

  // Handle file selection
  const handleFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const audioFiles: AudioFile[] = []
    const folderPath = selectedFiles[0].webkitRelativePath.split("/")[0]
    setFolderName(folderPath)

    Array.from(selectedFiles).forEach((file, index) => {
      if (file.type.startsWith("audio/")) {
        audioFiles.push({
          id: `${index}-${file.name}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          src: URL.createObjectURL(file),
          liked: false,
        })
      }
    })

    const jsonData = await loadFromJsonFile(selectedFiles, audioFiles)
    if (jsonData && jsonData.folderData) {
      applyPersistedData(jsonData.folderData, audioFiles)
      if (jsonData.globalHistory) {
        await persistence.applyImportedData(jsonData)
      }
    } else {
      const dbData = await persistence.loadState(folderPath, audioFiles)
      if (dbData) {
        applyPersistedData(dbData, audioFiles)
      } else {
        setFiles(audioFiles)
        setTrackStats({})
        if (audioFiles.length > 0) {
          setCurrentIndex(0)
        }
      }
    }
  }, [loadFromJsonFile, applyPersistedData, persistence])

  // Save state to IndexedDB when it changes
  useEffect(() => {
    if (folderName === "" || files.length === 0) return

    persistence.saveState({
      folderId: "",
      folderName,
      files,
      currentIndex,
      currentTime,
      volume,
      isShuffle,
      isRepeat,
    })
  }, [folderName, files, currentIndex, currentTime, volume, isShuffle, isRepeat, persistence])

  // Load track stats when folder changes
  useEffect(() => {
    loadTrackStats()
  }, [loadTrackStats])

  // Export current state to JSON file
  const handleExport = useCallback(async () => {
    if (folderName === "" || files.length === 0) return

    const json = await persistence.exportFolderData(
      files,
      folderName,
      currentIndex,
      currentTime,
      volume,
      isShuffle,
      isRepeat
    )
    
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.elevenmusic.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [folderName, files, currentIndex, currentTime, volume, isShuffle, isRepeat, persistence])

  // Import state from JSON file
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = await persistence.importFolderData(text, files)
      if (data) {
        applyPersistedData(data.folderData, files)
        if (data.globalHistory) {
          await persistence.applyImportedData(data)
        }
      }
    } catch (error) {
      console.error('Failed to import JSON:', error)
      alert('Failed to import settings file')
    }

    event.target.value = ''
  }, [files, applyPersistedData, persistence])

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current || currentIndex === -1) return

    if (isPlaying) {
      audioRef.current.pause()
      cancelAnimationFrame(animationRef.current)
    } else {
      audioRef.current.play()
      updateVisualizer()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentIndex, updateVisualizer])

  // Play specific file
  const playFile = useCallback((index: number) => {
    if (!audioRef.current || index < 0 || index >= files.length) return

    setCurrentIndex(index)
    audioRef.current.src = files[index].src
    audioRef.current.load()
    
    audioRef.current.oncanplay = () => {
      audioRef.current?.play()
      setIsPlaying(true)
      initAudioContext()
      updateVisualizer()
      playStartTimeRef.current = Date.now()
    }
  }, [files, initAudioContext, updateVisualizer])

  // Next track
  const playNext = useCallback(() => {
    if (files.length === 0) return

    let nextIndex: number
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * files.length)
    } else {
      nextIndex = (currentIndex + 1) % files.length
    }
    playFile(nextIndex)
  }, [files.length, currentIndex, isShuffle, playFile])

  // Previous track
  const playPrevious = useCallback(() => {
    if (files.length === 0) return

    let prevIndex: number
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * files.length)
    } else {
      prevIndex = currentIndex === 0 ? files.length - 1 : currentIndex - 1
    }
    playFile(prevIndex)
  }, [files.length, currentIndex, isShuffle, playFile])

  // Toggle like
  const toggleLike = useCallback((index: number) => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, liked: !file.liked } : file
    ))
  }, [])

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [])

  // Handle metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  // Handle track ended
  const handleEnded = useCallback(async () => {
    if (folderName && files.length > 0 && currentIndex >= 0) {
      const playTime = audioRef.current ? audioRef.current.currentTime : 0
      await persistence.trackPlay(folderName, files, currentIndex, playTime)
      const stats = await persistence.getTrackStats(folderName, files)
      setTrackStats(stats)
    }

    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      playStartTimeRef.current = Date.now()
    } else {
      playNext()
    }
  }, [isRepeat, playNext, folderName, files, currentIndex, persistence])

  // Seek
  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }, [])

  // Volume control
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    
    if (isMuted) {
      audioRef.current.volume = volume || 1
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume])

  // Skip forward/backward
  const skipForward = useCallback((seconds: number) => {
    if (!audioRef.current) return
    const newTime = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration || 0)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [])

  const skipBackward = useCallback((seconds: number) => {
    if (!audioRef.current) return
    const newTime = Math.max(audioRef.current.currentTime - seconds, 0)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [])

  // Keyboard shortcut handlers
  const handleVolumeUp = useCallback(() => handleVolumeChange([Math.min(volume + 0.1, 1)]), [volume, handleVolumeChange])
  const handleVolumeDown = useCallback(() => handleVolumeChange([Math.max(volume - 0.1, 0)]), [volume, handleVolumeChange])
  const handleFocusSearch = useCallback(() => searchInputRef.current?.focus(), [])
  const handleClearSearch = useCallback(() => { setSearchQuery(""); searchInputRef.current?.blur(); }, [])
  const toggleCurrentLike = useCallback(() => { if (currentIndex >= 0) toggleLike(currentIndex); }, [currentIndex, toggleLike])

  // Format time
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Keyboard shortcuts hook
  const { showToast } = useKeyboardShortcuts({
    onPlayPause: togglePlay,
    onNext: playNext,
    onPrevious: playPrevious,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onMuteToggle: toggleMute,
    onShuffleToggle: () => setIsShuffle(prev => !prev),
    onRepeatToggle: () => setIsRepeat(prev => !prev),
    onTheaterToggle: () => setIsTheaterMode(prev => !prev),
    onLikeToggle: toggleCurrentLike,
    onFocusSearch: handleFocusSearch,
    onClearSearch: handleClearSearch,
    onShowHelp: () => setShowKeyboardHelp(true),
    onHideHelp: () => setShowKeyboardHelp(false),
    isSearchFocused,
    isHelpOpen: showKeyboardHelp,
    hasCurrentTrack: currentIndex >= 0,
  })

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])
  
  const currentFile = currentIndex >= 0 ? files[currentIndex] : null
  const currentStats = currentFile ? trackStats[currentFile.name] : null

  // Filter files based on search query and liked filter
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLiked = showOnlyLiked ? file.liked : true
    return matchesSearch && matchesLiked
  })

  // Get the original index of a filtered file
  const getOriginalIndex = (filteredIndex: number) => {
    const filteredFile = filteredFiles[filteredIndex]
    return files.findIndex(f => f.id === filteredFile.id)
  }

  // ─── Playlist content (reused in sidebar) ───
  const playlistContent = (
    <>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground/90">
            <ListMusic className="w-5 h-5 text-primary" />
            <span className="tracking-tight">Playlist</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all hidden sm:block"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-5 h-5" />
            </button>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            {/* Close button (mobile, or desktop in theater mode) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "rounded-full hover:bg-muted text-muted-foreground hover:text-foreground w-8 h-8",
                isTheaterMode ? "" : "lg:hidden"
              )}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full bg-muted/50 border-border text-foreground/80 hover:bg-muted hover:text-foreground hover:border-border transition-all duration-200 mb-2"
        >
          <FolderOpen className="w-4 h-4 mr-2 text-primary" />
          Open Folder
        </Button>

        {files.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex-1 bg-muted/50 border-border text-foreground/80 hover:bg-muted hover:text-foreground hover:border-border transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              Export
            </Button>
            <Button
              onClick={() => importInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="flex-1 bg-muted/50 border-border text-foreground/80 hover:bg-muted hover:text-foreground hover:border-border transition-all duration-200"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              Import
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      {files.length > 0 && (
        <div className="px-4 py-3 border-b border-border space-y-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => setShowOnlyLiked(false)}
              className={cn(
                "flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all",
                !showOnlyLiked 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              All
            </button>
            <button
              onClick={() => setShowOnlyLiked(true)}
              className={cn(
                "flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1",
                showOnlyLiked 
                  ? "bg-rose-500/20 text-rose-400" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Heart className="w-3 h-3" />
              Liked
            </button>
          </div>
        </div>
      )}

      {/* Folder Name */}
      {folderName && (
        <div className="px-4 sm:px-6 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border flex-shrink-0">
          {folderName}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
              <Music className="w-8 h-8" />
            </div>
            <p className="text-center text-sm">
              Select a folder to load your music
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <Search className="w-8 h-8 mb-3" />
            <p className="text-center text-sm">
              No tracks found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredFiles.map((file, filteredIndex) => {
              const originalIndex = getOriginalIndex(filteredIndex)
              const stats = trackStats[file.name]
              return (
                <div
                  key={file.id}
                  onClick={() => playFile(originalIndex)}
                  className={cn(
                    "group px-4 py-3 hover:bg-muted/50 transition-all duration-200 cursor-pointer flex items-center gap-3",
                    currentIndex === originalIndex && "bg-muted hover:bg-muted"
                  )}
                >
                  <div className="w-8 flex items-center justify-center">
                    {currentIndex === originalIndex && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4">
                        <span className="w-1 bg-primary animate-pulse" style={{ height: "40%", animationDelay: "0ms" }} />
                        <span className="w-1 bg-primary animate-pulse" style={{ height: "70%", animationDelay: "150ms" }} />
                        <span className="w-1 bg-primary animate-pulse" style={{ height: "100%", animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm font-medium group-hover:text-foreground/50">
                        {originalIndex + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "block truncate text-sm font-medium",
                      currentIndex === originalIndex ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
                    )}>
                      {file.name}
                    </span>
                    {stats && stats.playCount > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          {stats.playCount} {stats.playCount === 1 ? 'play' : 'plays'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLike(originalIndex)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        file.liked ? "fill-rose-500 text-rose-500" : "text-muted-foreground hover:text-foreground"
                      )} 
                    />
                  </button>

                  {currentIndex === originalIndex && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Track Count & Stats Toggle */}
      {files.length > 0 && (
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filteredFiles.length} of {files.length} {files.length === 1 ? "track" : "tracks"}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <button
              onClick={() => setShowStats(!showStats)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showStats ? "text-primary bg-primary/20" : "hover:text-foreground hover:bg-muted"
              )}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )

  // ─── Visualizer section (reused in both layouts) ───
  const visualizerSection = (
    <div 
      className="flex flex-col items-center justify-center relative px-4 sm:px-8 flex-1"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-full h-full flex items-center justify-center">
        {currentVisualizer === "waveform" && (
          <>
            {/* Central Orb - responsive sizing via CSS */}
            <div className="relative mb-4 sm:mb-8">
              <AudioOrb 
                isPlaying={isPlaying} 
                audioData={audioData} 
                className="drop-shadow-[0_0_40px_rgba(99,102,241,0.3)] w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] lg:w-[320px] lg:h-[320px]"
                colors={visualizerColors}
              />
              
              <div className={cn(
                "absolute inset-0 rounded-full border border-border/50 transition-all duration-500",
                isPlaying && "scale-110 opacity-50"
              )} />
            </div>

            {/* Waveform Visualizer */}
            <div className="w-full max-w-3xl px-4 sm:px-8 h-20 sm:h-32 absolute bottom-16 sm:bottom-32">
              <WaveformVisualizer
                audioData={audioData}
                isPlaying={isPlaying}
                barCount={100}
                className="opacity-80"
                colors={visualizerColors}
              />
            </div>
          </>
        )}

        {currentVisualizer === "circular" && (
          <div className="w-full h-[280px] sm:h-[380px] lg:h-[450px] max-w-3xl">
            <CircularVisualizer
              audioData={audioData}
              isPlaying={isPlaying}
              className="opacity-90"
              colors={visualizerColors}
            />
          </div>
        )}

        {currentVisualizer === "rings" && (
          <div className="w-full h-[280px] sm:h-[380px] lg:h-[450px] max-w-3xl">
            <FrequencyRingVisualizer
              audioData={audioData}
              isPlaying={isPlaying}
              className="opacity-90"
              colors={visualizerColors}
            />
          </div>
        )}

        {currentVisualizer === "particles" && (
          <div className="absolute inset-0 z-0">
            <ParticlesVisualizer
              audioData={audioData}
              isPlaying={isPlaying}
              colors={visualizerColors}
            />
          </div>
        )}
      </div>

      {/* Track Info Overlay */}
      <div className="mt-4 sm:mt-8 text-center">
        {currentFile ? (
          <>
            <h1 className="font-bold text-foreground mb-1 sm:mb-2 tracking-tight text-lg sm:text-2xl px-4 truncate max-w-[90vw] sm:max-w-none">
              {currentFile.name}
            </h1>
            <div className="flex items-center justify-center gap-4 text-muted-foreground text-xs sm:text-sm">
              <span>Track {currentIndex + 1} of {files.length}</span>
              {currentStats && currentStats.playCount > 0 && (
                <span className="flex items-center gap-1">
                  <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  {currentStats.playCount} {currentStats.playCount === 1 ? 'play' : 'plays'}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">
            <p className="text-base sm:text-lg font-medium mb-1">No track selected</p>
            <p className="text-xs sm:text-sm">Open a folder to start listening</p>
          </div>
        )}
      </div>

      {/* Skip Buttons - 5s and 15s */}
      {currentFile && (
        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipBackward(15)}
            disabled={!currentFile}
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 h-8 px-3 text-xs"
          >
            <SkipBack className="w-3 h-3 mr-1" />
            15s
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipBackward(5)}
            disabled={!currentFile}
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 h-8 px-3 text-xs"
          >
            <SkipBack className="w-3 h-3 mr-1" />
            5s
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipForward(5)}
            disabled={!currentFile}
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 h-8 px-3 text-xs"
          >
            5s
            <SkipForward className="w-3 h-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipForward(15)}
            disabled={!currentFile}
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 h-8 px-3 text-xs"
          >
            15s
            <SkipForward className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )

  // ─── Player controls (reused in both layouts) ───
  const playerControls = (
    <div className="bg-gradient-to-t from-background/50 to-transparent pb-4 sm:pb-8">
      {/* Progress Bar */}
      <div className="max-w-3xl mx-auto mb-4 sm:mb-6 px-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <span className="text-xs text-muted-foreground font-medium tabular-nums w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground font-medium tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="max-w-3xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-4">
        {/* Left Controls */}
        <div className="flex items-center gap-1 sm:gap-2 justify-start">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsShuffle(!isShuffle)}
            className={cn(
              "rounded-full hover:bg-muted transition-all w-8 h-8 sm:w-10 sm:h-10",
              isShuffle ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRepeat(!isRepeat)}
            className={cn(
              "rounded-full hover:bg-muted transition-all w-8 h-8 sm:w-10 sm:h-10",
              isRepeat ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>

        {/* Main Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-4 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={playPrevious}
            disabled={files.length === 0}
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 w-10 h-10 sm:w-12 sm:h-12"
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          
          <Button
            size="lg"
            onClick={togglePlay}
            disabled={!currentFile}
            className="rounded-full w-12 h-12 sm:w-16 sm:h-16 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-7 sm:h-7" />
            ) : (
              <Play className="w-5 h-5 sm:w-7 sm:h-7 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            disabled={files.length === 0}
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 w-10 h-10 sm:w-12 sm:h-12"
          >
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>

        {/* Volume Control - popover on mobile, inline on desktop */}
        <div className="flex items-center justify-end">
          {/* Mobile: popover */}
          <div className="sm:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground w-8 h-8"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="end"
                className="w-auto p-3 flex flex-col items-center gap-3"
              >
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  orientation="vertical"
                  className="h-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground w-8 h-8"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Desktop: inline slider */}
          <div className="hidden sm:flex items-center gap-3 w-32">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden font-sans transition-all duration-300">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />

      {/* Hidden file inputs (always present) */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Sidebar backdrop (mobile always, desktop only in theater mode) */}
      {isSidebarOpen && (
        <div 
          className={cn(
            "fixed inset-0 bg-black/50 z-40",
            isTheaterMode ? "" : "lg:hidden"
          )}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      {/* Mobile: fixed slide-over drawer. Desktop: static in flex flow (or drawer in theater mode). */}
      <aside className={cn(
        "flex flex-col bg-card border-r border-border flex-shrink-0",
        // Mobile: fixed drawer
        "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-80",
        "transition-transform duration-300",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: static sidebar in flex flow (unless theater mode)
        !isTheaterMode && "lg:static lg:z-0 lg:w-80 lg:max-w-none lg:translate-x-0 lg:transition-none"
      )}>
        {playlistContent}
      </aside>

      {/* ─── Main content area ─── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Hamburger - mobile only (or desktop in theater mode) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "rounded-full hover:bg-muted text-muted-foreground hover:text-foreground w-9 h-9 sm:w-10 sm:h-10",
                isTheaterMode ? "" : "lg:hidden"
              )}
            >
              <Menu className="w-5 h-5" />
            </Button>
            {/* Current track name (mobile only, or desktop in theater mode) */}
            {currentFile && (
              <div className={cn(isTheaterMode ? "" : "lg:hidden")}>
                <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{currentFile.name}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Theater mode toggle - desktop only */}
            <button
              onClick={() => setIsTheaterMode(prev => !prev)}
              className={cn(
                "hidden lg:flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all",
                isTheaterMode && "bg-muted/50 text-foreground"
              )}
              title={isTheaterMode ? "Exit theater mode (T)" : "Theater mode (T)"}
            >
              {isTheaterMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <SettingsPanel
              currentVisualizer={currentVisualizer}
              onVisualizerChange={setCurrentVisualizer}
            />
          </div>
        </div>

        {/* Glass Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />

        {/* Visualizer + Controls */}
        <div className="flex-1 flex flex-col relative z-10">
          {visualizerSection}
          {playerControls}
        </div>
      </div>

      {/* Keyboard Help Modal */}
      <KeyboardHelp
        open={showKeyboardHelp}
        onOpenChange={setShowKeyboardHelp}
      />

      {/* Keyboard Shortcut Toast */}
      {showToast.visible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-card/80 backdrop-blur-md border border-border rounded-full px-4 py-2 text-sm text-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
