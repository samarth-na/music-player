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
  PanelLeftClose,
  PanelLeft,
  Maximize2,
  Minimize2
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
import { SettingsPanel, VisualizerType, LayoutType } from "@/components/settings-panel"
import { AudioFile, TrackStats, FolderData } from "@/lib/persistence"
import { usePersistence } from "@/lib/persistence/hooks"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardHelp } from "@/components/keyboard-help"
import Link from "next/link"

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
  
  // Visualizer and Layout states (Theme is managed by ThemeProvider)
  const [currentVisualizer, setCurrentVisualizer] = useState<VisualizerType>("waveform")
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("default")
  const [showControls, setShowControls] = useState(true)
  const [isMouseIdle, setIsMouseIdle] = useState(false)
  const mouseIdleTimerRef = useRef<NodeJS.Timeout | null>(null)
  
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
    // Restore liked states
    const likedNames = new Set(data.favorites || [])
    const filesWithLikes = audioFiles.map(file => ({
      ...file,
      liked: likedNames.has(file.name)
    }))
    setFiles(filesWithLikes)

    // Restore track stats
    if (data.trackStats) {
      setTrackStats(data.trackStats)
    }

    // Restore last track
    if (data.lastPlayedTrackIndex !== undefined && data.lastPlayedTrackIndex >= 0) {
      setCurrentIndex(data.lastPlayedTrackIndex)
    } else if (audioFiles.length > 0) {
      setCurrentIndex(0)
    }

    // Restore volume
    if (data.volume !== undefined) {
      const newVolume = data.volume
      setVolume(newVolume)
      if (audioRef.current) {
        audioRef.current.volume = newVolume
      }
    }

    // Restore shuffle
    if (data.isShuffle !== undefined) {
      setIsShuffle(data.isShuffle)
    }

    // Restore repeat
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

    // Try to load from JSON file first
    const jsonData = await loadFromJsonFile(selectedFiles, audioFiles)
    if (jsonData && jsonData.folderData) {
      applyPersistedData(jsonData.folderData, audioFiles)
      // Apply global history if present
      if (jsonData.globalHistory) {
        await persistence.applyImportedData(jsonData)
      }
    } else {
      // Try to load from IndexedDB
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
      folderId: "", // Will be generated internally
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
        // Apply global history if present
        if (data.globalHistory) {
          await persistence.applyImportedData(data)
        }
      }
    } catch (error) {
      console.error('Failed to import JSON:', error)
      alert('Failed to import settings file')
    }

    // Reset input
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
      // Record play start time
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
    // Track play completion
    if (folderName && files.length > 0 && currentIndex >= 0) {
      const playTime = audioRef.current ? audioRef.current.currentTime : 0
      await persistence.trackPlay(folderName, files, currentIndex, playTime)
      // Update stats display
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

  // Mouse idle detection for theater mode
  useEffect(() => {
    if (currentLayout !== "theater") {
      setIsMouseIdle(false)
      setShowControls(true)
      return
    }

    const handleMouseMove = () => {
      setIsMouseIdle(false)
      setShowControls(true)
      
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current)
      }
      
      mouseIdleTimerRef.current = setTimeout(() => {
        setIsMouseIdle(true)
        setShowControls(false)
      }, 3000) // Hide after 3 seconds of no mouse movement
    }

    window.addEventListener("mousemove", handleMouseMove)
    handleMouseMove() // Initialize timer

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current)
      }
    }
  }, [currentLayout])

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

  // Computed values for layout
  const showSidebar = currentLayout === "default" || currentLayout === "split" || currentLayout === "vertical"
  const isTheaterMode = currentLayout === "theater"
  const isCompactMode = currentLayout === "compact"
  const isVerticalMode = currentLayout === "vertical"
  const isSplitMode = currentLayout === "split"

  return (
    <div className={cn(
      "flex h-screen bg-background text-foreground overflow-hidden font-sans transition-all duration-300",
      isTheaterMode && "cursor-none",
      isTheaterMode && !isMouseIdle && "cursor-auto",
      isVerticalMode && "flex-col"
    )}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />

      {/* Fixed Settings Button - Right Side */}
      <div className="fixed right-6 top-6 z-30">
        <SettingsPanel
          currentVisualizer={currentVisualizer}
          onVisualizerChange={setCurrentVisualizer}
          currentLayout={currentLayout}
          onLayoutChange={setCurrentLayout}
        />
      </div>

       {/* Left Sidebar - Playlist (hidden in compact/theater, top in vertical) */}
       <div className={cn(
          "flex flex-col border-border transition-all duration-300",
          isVerticalMode 
            ? "w-full h-48 bg-transparent border-b" 
            : "bg-card border-r",
          showSidebar && !isVerticalMode ? (isSplitMode ? "w-1/2" : "w-80") : (!isVerticalMode && "w-0 opacity-0 pointer-events-none overflow-hidden")
        )}>
        {/* Header - Hidden in vertical mode */}
        {!isVerticalMode && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground/90">
              <ListMusic className="w-5 h-5 text-primary" />
              <span className="tracking-tight">Playlist</span>
            </h2>
             <div className="flex items-center gap-2">
               <Link
                 href="/shortcuts"
                 className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                 title="Keyboard Shortcuts"
               >
                 <Keyboard className="w-5 h-5" />
               </Link>
               <ThemeToggle className="text-muted-foreground hover:text-foreground" />
             </div>
          </div>
          
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
        )}

        {/* Hidden inputs for vertical mode */}
        {isVerticalMode && (
          <>
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
          </>
        )}

        {/* Search & Filter - Hidden in vertical mode */}
        {files.length > 0 && !isVerticalMode && (
          <div className="px-4 py-3 border-b border-border space-y-2">
            {/* Search Input */}
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
            
            {/* Filter Tabs */}
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

        {/* Folder Name - Hidden in vertical mode */}
        {folderName && !isVerticalMode && (
          <div className="px-6 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
            {folderName}
          </div>
        )}

        {/* File List - Horizontal scroll in vertical mode */}
        <div className={cn(
          "flex-1",
          isVerticalMode ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto"
        )}>
          {files.length === 0 ? (
            <div className={cn(
              "flex items-center justify-center h-full text-muted-foreground",
              isVerticalMode ? "flex-row gap-4 px-6" : "flex-col p-6"
            )}>
              <div className={cn(
                "rounded-full bg-muted flex items-center justify-center",
                isVerticalMode ? "w-10 h-10" : "w-16 h-16 mb-4"
              )}>
                <Music className={cn(isVerticalMode ? "w-5 h-5" : "w-8 h-8")} />
              </div>
              <p className="text-center text-sm">
                Select a folder to load your music
              </p>
              {isVerticalMode && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="ml-4 bg-muted/50 border-border"
                >
                  <FolderOpen className="w-4 h-4 mr-2 text-primary" />
                  Open Folder
                </Button>
              )}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
              <Search className="w-8 h-8 mb-3" />
              <p className="text-center text-sm">
                No tracks found
              </p>
            </div>
          ) : isVerticalMode ? (
            /* Horizontal track list for vertical mode */
            <div className="flex gap-2 px-4 py-2 h-full items-center">
              {filteredFiles.map((file, filteredIndex) => {
                const originalIndex = getOriginalIndex(filteredIndex)
                return (
                  <button
                    key={file.id}
                    onClick={() => playFile(originalIndex)}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm",
                      currentIndex === originalIndex 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                    )}
                  >
                    {currentIndex === originalIndex && isPlaying && (
                      <div className="flex gap-0.5 items-end h-3">
                        <span className="w-0.5 bg-primary animate-pulse" style={{ height: "40%", animationDelay: "0ms" }} />
                        <span className="w-0.5 bg-primary animate-pulse" style={{ height: "70%", animationDelay: "150ms" }} />
                        <span className="w-0.5 bg-primary animate-pulse" style={{ height: "100%", animationDelay: "300ms" }} />
                      </div>
                    )}
                    <span className="truncate max-w-48">{file.name}</span>
                    {file.liked && <Heart className="w-3 h-3 fill-rose-500 text-rose-500 flex-shrink-0" />}
                  </button>
                )
              })}
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
                    {/* Track Number / Playing Indicator */}
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

                    {/* Track Name and Stats */}
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

                    {/* Like Button */}
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

                    {/* Active Indicator */}
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
          <div className="p-4 border-t border-border">
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
      </div>

       {/* Main Player Area */}
       <div className={cn(
         "flex-1 flex relative",
         isVerticalMode ? "flex-col" : "flex-col"
       )}>
         {/* Glass Background Effect */}
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />
        
        {/* Floating Controls Header for Compact/Theater modes */}
        {!showSidebar && (
          <div className={cn(
            "absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between transition-all duration-300",
            isTheaterMode && isMouseIdle && "opacity-0 pointer-events-none"
          )}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentLayout("default")}
                className="p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-card transition-all"
                title="Show Sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
              {currentFile && (
                <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-foreground truncate max-w-md">{currentFile.name}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        )}
        
        {/* Visualizer Section */}
        <div 
          className={cn(
            "flex flex-col items-center justify-center relative px-8",
            isTheaterMode && "px-0",
            isVerticalMode ? "h-64 flex-shrink-0" : "flex-1"
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Dynamic Visualizer */}
          <div className={cn(
            "w-full h-full flex items-center justify-center",
            isTheaterMode && "scale-125"
          )}>
            {currentVisualizer === "waveform" && (
              <>
                {/* Central Orb */}
                <div className="relative mb-8">
                  <AudioOrb 
                    isPlaying={isPlaying} 
                    audioData={audioData} 
                    size={isTheaterMode ? 420 : 320}
                    className="drop-shadow-[0_0_40px_rgba(99,102,241,0.3)]"
                    colors={visualizerColors}
                  />
                  
                  {/* Glow ring */}
                  <div className={cn(
                    "absolute inset-0 rounded-full border border-border/50 transition-all duration-500",
                    isPlaying && "scale-110 opacity-50"
                  )} />
                </div>

                {/* Waveform Visualizer */}
                <div className={cn(
                  "w-full max-w-3xl px-8 h-32 absolute",
                  isTheaterMode ? "bottom-48 max-w-5xl h-40" : "bottom-32"
                )}>
                  <WaveformVisualizer
                    audioData={audioData}
                    isPlaying={isPlaying}
                    barCount={isTheaterMode ? 140 : 100}
                    className="opacity-80"
                    colors={visualizerColors}
                  />
                </div>
              </>
            )}

            {currentVisualizer === "circular" && (
              <div className={cn(
                "w-full h-[450px]",
                isTheaterMode ? "max-w-5xl h-[600px]" : "max-w-3xl"
              )}>
                <CircularVisualizer
                  audioData={audioData}
                  isPlaying={isPlaying}
                  className="opacity-90"
                  colors={visualizerColors}
                />
              </div>
            )}

            {currentVisualizer === "rings" && (
              <div className={cn(
                "w-full h-[450px]",
                isTheaterMode ? "max-w-5xl h-[600px]" : "max-w-3xl"
              )}>
                <FrequencyRingVisualizer
                  audioData={audioData}
                  isPlaying={isPlaying}
                  className="opacity-90"
                  colors={visualizerColors}
                />
              </div>
            )}

            {currentVisualizer === "particles" && (
              <div className={cn(
                "w-full h-[450px]",
                isTheaterMode ? "max-w-5xl h-[600px]" : "max-w-3xl"
              )}>
                <ParticlesVisualizer
                  audioData={audioData}
                  isPlaying={isPlaying}
                  className="opacity-90"
                  colors={visualizerColors}
                />
              </div>
            )}
          </div>

          {/* Track Info Overlay */}
          <div className={cn(
            "mt-8 text-center transition-all duration-300",
            isTheaterMode && isMouseIdle && "opacity-0"
          )}>
            {currentFile ? (
              <>
                <h1 className={cn(
                  "font-bold text-foreground mb-2 tracking-tight",
                  isTheaterMode ? "text-4xl" : "text-2xl"
                )}>
                  {currentFile.name}
                </h1>
                <div className="flex items-center justify-center gap-4 text-muted-foreground text-sm">
                  <span>Track {currentIndex + 1} of {files.length}</span>
                  {currentStats && currentStats.playCount > 0 && (
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      {currentStats.playCount} {currentStats.playCount === 1 ? 'play' : 'plays'}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                <p className="text-lg font-medium mb-1">No track selected</p>
                <p className="text-sm">Open a folder to start listening</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Controls Section */}
        <div className={cn(
          "bg-gradient-to-t from-background/50 to-transparent transition-all duration-300",
          isTheaterMode && isMouseIdle && "opacity-0 pointer-events-none",
          isVerticalMode ? "flex-1 flex flex-col justify-end pb-6" : "pb-48",
          isCompactMode && "pb-8"
        )}>
          {/* Progress Bar */}
          <div className={cn(
            "max-w-3xl mx-auto mb-6 px-4",
            isTheaterMode && "max-w-5xl"
          )}>
            <div className="flex items-center gap-3 mb-2">
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
          <div className={cn(
            "max-w-3xl mx-auto flex items-center justify-between px-4",
            isTheaterMode && "max-w-5xl"
          )}>
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShuffle(!isShuffle)}
                className={cn(
                  "rounded-full hover:bg-muted transition-all",
                  isShuffle ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRepeat(!isRepeat)}
                className={cn(
                  "rounded-full hover:bg-muted transition-all",
                  isRepeat ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>

            {/* Main Playback Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={playPrevious}
                disabled={files.length === 0}
                className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 w-12 h-12"
              >
                <SkipBack className="w-6 h-6" />
              </Button>
              
              <Button
                size="lg"
                onClick={togglePlay}
                disabled={!currentFile}
                className="rounded-full w-16 h-16 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-1" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={playNext}
                disabled={files.length === 0}
                className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 w-12 h-12"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 w-32">
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
          
          {/* Bottom Padding */}
          <div className={cn("h-6", isCompactMode && "h-2")} />
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
