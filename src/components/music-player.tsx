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
  Heart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { AudioOrb } from "@/components/audio-orb"
import { WaveformVisualizer } from "@/components/waveform-visualizer"

interface AudioFile {
  id: string
  name: string
  src: string
  duration?: number
  liked?: boolean
}

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
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Handle file selection
  const handleFolderSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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

    setFiles(audioFiles)
    if (audioFiles.length > 0) {
      setCurrentIndex(0)
    }
  }, [])

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
  const handleEnded = useCallback(() => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    } else {
      playNext()
    }
  }, [isRepeat, playNext])

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

  // Format time
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const currentFile = currentIndex >= 0 ? files[currentIndex] : null

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />

      {/* Left Sidebar - Playlist */}
      <div className="w-80 flex flex-col bg-[#0f0f0f] border-r border-white/5">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-white/90">
              <ListMusic className="w-5 h-5 text-indigo-400" />
              <span className="tracking-tight">Playlist</span>
            </h2>
            <ThemeToggle className="text-white/60 hover:text-white" />
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

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200"
          >
            <FolderOpen className="w-4 h-4 mr-2 text-indigo-400" />
            Open Folder
          </Button>
        </div>

        {/* Folder Name */}
        {folderName && (
          <div className="px-6 py-3 text-xs text-white/40 font-medium uppercase tracking-wider border-b border-white/5">
            {folderName}
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30 p-6">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Music className="w-8 h-8" />
              </div>
              <p className="text-center text-sm">
                Select a folder to load your music
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  onClick={() => playFile(index)}
                  className={cn(
                    "group px-4 py-3 hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center gap-3",
                    currentIndex === index && "bg-white/10 hover:bg-white/10"
                  )}
                >
                  {/* Track Number / Playing Indicator */}
                  <div className="w-8 flex items-center justify-center">
                    {currentIndex === index && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4">
                        <span className="w-1 bg-indigo-400 animate-pulse" style={{ height: "40%", animationDelay: "0ms" }} />
                        <span className="w-1 bg-indigo-400 animate-pulse" style={{ height: "70%", animationDelay: "150ms" }} />
                        <span className="w-1 bg-indigo-400 animate-pulse" style={{ height: "100%", animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <span className="text-white/30 text-sm font-medium group-hover:text-white/50">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Track Name */}
                  <span className={cn(
                    "flex-1 truncate text-sm font-medium",
                    currentIndex === index ? "text-white" : "text-white/60 group-hover:text-white/80"
                  )}>
                    {file.name}
                  </span>

                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLike(index)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        file.liked ? "fill-rose-500 text-rose-500" : "text-white/30 hover:text-white/60"
                      )} 
                    />
                  </button>

                  {/* Active Indicator */}
                  {currentIndex === index && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Track Count */}
        {files.length > 0 && (
          <div className="p-4 border-t border-white/5 text-xs text-white/30 text-center">
            {files.length} {files.length === 1 ? "track" : "tracks"}
          </div>
        )}
      </div>

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Glass Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent pointer-events-none" />
        
        {/* Visualizer Section */}
        <div 
          className="flex-1 flex flex-col items-center justify-center relative"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Central Orb */}
          <div className="relative mb-8">
            <AudioOrb 
              isPlaying={isPlaying} 
              audioData={audioData} 
              size={280}
              className="drop-shadow-[0_0_40px_rgba(99,102,241,0.3)]"
            />
            
            {/* Glow ring */}
            <div className={cn(
              "absolute inset-0 rounded-full border border-white/10 transition-all duration-500",
              isPlaying && "scale-110 opacity-50"
            )} />
          </div>

          {/* Waveform Visualizer */}
          <div className="w-full max-w-2xl px-8 h-24">
            <WaveformVisualizer
              audioData={audioData}
              isPlaying={isPlaying}
              barCount={80}
              className="opacity-80"
            />
          </div>

          {/* Track Info Overlay */}
          <div className="mt-8 text-center">
            {currentFile ? (
              <>
                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  {currentFile.name}
                </h1>
                <p className="text-white/40 text-sm">
                  Track {currentIndex + 1} of {files.length}
                </p>
              </>
            ) : (
              <div className="text-white/30">
                <p className="text-lg font-medium mb-1">No track selected</p>
                <p className="text-sm">Open a folder to start listening</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Controls Section */}
        <div className="p-8 bg-gradient-to-t from-black/50 to-transparent">
          {/* Progress Bar */}
          <div className="max-w-3xl mx-auto mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-white/40 font-medium tabular-nums w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-white/40 font-medium tabular-nums w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShuffle(!isShuffle)}
                className={cn(
                  "rounded-full hover:bg-white/10 transition-all",
                  isShuffle ? "text-indigo-400" : "text-white/40"
                )}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRepeat(!isRepeat)}
                className={cn(
                  "rounded-full hover:bg-white/10 transition-all",
                  isRepeat ? "text-indigo-400" : "text-white/40"
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
                className="rounded-full hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 w-12 h-12"
              >
                <SkipBack className="w-6 h-6" />
              </Button>
              
              <Button
                size="lg"
                onClick={togglePlay}
                disabled={!currentFile}
                className="rounded-full w-16 h-16 bg-white text-black hover:bg-white/90 disabled:opacity-30 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
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
                className="rounded-full hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 w-12 h-12"
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
                className="rounded-full hover:bg-white/10 text-white/40 hover:text-white"
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
    </div>
  )
}
