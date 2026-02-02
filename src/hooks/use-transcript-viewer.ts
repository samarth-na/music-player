"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import type { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel"

export interface TranscriptWord {
  kind: "word"
  segmentIndex: number
  text: string
  start: number
  end: number
  characters: string[]
  characterStartTimes: number[]
  characterEndTimes: number[]
}

export interface TranscriptGap {
  kind: "gap"
  segmentIndex: number
  text: string
  start: number
  end: number
}

export type TranscriptSegment = TranscriptWord | TranscriptGap

export type SegmentComposer = (segments: TranscriptSegment[]) => TranscriptSegment[]

export interface UseTranscriptViewerResult {
  audioRef: React.RefObject<HTMLAudioElement | null>
  spokenSegments: TranscriptWord[]
  unspokenSegments: TranscriptWord[]
  currentWord: TranscriptWord | null
  segments: TranscriptSegment[]
  duration: number
  currentTime: number
  isPlaying: boolean
  play: () => void
  pause: () => void
  seekToTime: (time: number) => void
  startScrubbing: () => void
  endScrubbing: () => void
}

export interface UseTranscriptViewerOptions {
  alignment: CharacterAlignmentResponseModel
  hideAudioTags?: boolean
  segmentComposer?: SegmentComposer
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  onDurationChange?: (duration: number) => void
}

export function useTranscriptViewer(options: UseTranscriptViewerOptions): UseTranscriptViewerResult {
  const { alignment, segmentComposer, onPlay, onPause, onTimeUpdate, onEnded, onDurationChange } = options
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)

  // Parse alignment data into segments
  const segments = useCallback((): TranscriptSegment[] => {
    if (!alignment || !alignment.characters || !alignment.characterStartTimesSeconds || !alignment.characterEndTimesSeconds) {
      return []
    }

    const words: TranscriptWord[] = []
    let currentWord = ""
    let wordStart = 0
    let charStartTimes: number[] = []
    let charEndTimes: number[] = []
    let characters: string[] = []

    alignment.characters.forEach((char, i) => {
      if (char === " ") {
        if (currentWord) {
          words.push({
            kind: "word",
            segmentIndex: words.length,
            text: currentWord,
            start: wordStart,
            end: alignment.characterEndTimesSeconds[i - 1],
            characters,
            characterStartTimes: charStartTimes,
            characterEndTimes: charEndTimes,
          })
          currentWord = ""
          charStartTimes = []
          charEndTimes = []
          characters = []
        }
      } else {
        if (!currentWord) {
          wordStart = alignment.characterStartTimesSeconds[i]
        }
        currentWord += char
        characters.push(char)
        charStartTimes.push(alignment.characterStartTimesSeconds[i])
        charEndTimes.push(alignment.characterEndTimesSeconds[i])
      }
    })

    // Add last word if exists
    if (currentWord) {
      const lastIndex = alignment.characters.length - 1
      words.push({
        kind: "word",
        segmentIndex: words.length,
        text: currentWord,
        start: wordStart,
        end: alignment.characterEndTimesSeconds[lastIndex],
        characters,
        characterStartTimes: charStartTimes,
        characterEndTimes: charEndTimes,
      })
    }

    return segmentComposer ? segmentComposer(words) : words
  }, [alignment, segmentComposer])()

  // Find current word based on time
  const currentWord = useCallback((): TranscriptWord | null => {
    const wordSegments = segments.filter((s): s is TranscriptWord => s.kind === "word")
    for (const word of wordSegments) {
      if (currentTime >= word.start && currentTime <= word.end) {
        return word
      }
    }
    return null
  }, [segments, currentTime])()

  // Get spoken and unspoken segments
  const spokenSegments = useCallback((): TranscriptWord[] => {
    return segments.filter((s): s is TranscriptWord => s.kind === "word" && s.end < currentTime)
  }, [segments, currentTime])()

  const unspokenSegments = useCallback((): TranscriptWord[] => {
    return segments.filter((s): s is TranscriptWord => s.kind === "word" && s.start > currentTime)
  }, [segments, currentTime])()

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      onPlay?.()
    }
  }, [onPlay])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      onPause?.()
    }
  }, [onPause])

  const seekToTime = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const startScrubbing = useCallback(() => {
    setIsScrubbing(true)
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  const endScrubbing = useCallback(() => {
    setIsScrubbing(false)
    if (audioRef.current && isPlaying) {
      audioRef.current.play()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const newTime = audio.currentTime
      setCurrentTime(newTime)
      onTimeUpdate?.(newTime)
    }

    const handleDurationChange = () => {
      const newDuration = audio.duration || 0
      setDuration(newDuration)
      onDurationChange?.(newDuration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
  }, [onTimeUpdate, onDurationChange, onEnded])

  return {
    audioRef,
    spokenSegments,
    unspokenSegments,
    currentWord,
    segments,
    duration,
    currentTime,
    isPlaying,
    play,
    pause,
    seekToTime,
    startScrubbing,
    endScrubbing,
  }
}
