import { useCallback, useEffect, useRef } from 'react'
import { FolderData, GlobalSettings, AudioFile, ExportData, GlobalHistory, TrackStats, GlobalTrackHistory } from './types'
import {
  generateFolderId,
  saveFolderData,
  loadFolderData,
  saveGlobalSettings,
  loadGlobalSettings,
  saveGlobalHistory,
  loadGlobalHistory,
} from './db'

const EXPORT_FILENAME = '.elevenmusic.json'
const MAX_RECENT_FOLDERS = 10
const MAX_RECENTLY_PLAYED = 50

interface PersistenceState {
  folderId: string
  folderName: string
  files: AudioFile[]
  currentIndex: number
  currentTime: number
  volume: number
  isShuffle: boolean
  isRepeat: boolean
}

// Export folder data to JSON file
export async function exportFolderData(
  files: AudioFile[],
  folderName: string,
  currentIndex: number,
  currentTime: number,
  volume: number,
  isShuffle: boolean,
  isRepeat: boolean
): Promise<string> {
  const trackNames = files.map(f => f.name)
  const folderId = generateFolderId(folderName, trackNames)
  
  // Get existing data from IndexedDB to merge
  const existingData = await loadFolderData(folderId)
  const globalHistory = await loadGlobalHistory()
  
  const exportData: ExportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    folderData: {
      folderId,
      folderName,
      lastOpened: Date.now(),
      lastPlayedTrackIndex: currentIndex,
      lastPlayedPosition: currentTime,
      lastPlayedTimestamp: Date.now(),
      favorites: existingData?.favorites || files.filter(f => f.liked).map(f => f.name) || [],
      volume,
      isShuffle,
      isRepeat,
      customPlaylists: existingData?.customPlaylists || [],
      recentlyPlayed: existingData?.recentlyPlayed || [],
      trackStats: existingData?.trackStats || {},
    },
    globalHistory: globalHistory || { tracks: {}, totalPlays: 0, lastUpdated: Date.now() }
  }
  
  return JSON.stringify(exportData, null, 2)
}

// Import folder data from JSON file
export async function importFolderData(
  jsonContent: string,
  currentFiles: AudioFile[]
): Promise<{ folderData: Partial<FolderData>; globalHistory?: GlobalHistory } | null> {
  try {
    const data: ExportData = JSON.parse(jsonContent)
    
    // Validate version
    if (!data.version || !data.folderData) {
      console.error('Invalid export file format')
      return null
    }
    
    // Filter favorites to only include tracks that exist in current folder
    const currentTrackNames = new Set(currentFiles.map(f => f.name))
    const validFavorites = data.folderData.favorites.filter(name => 
      currentTrackNames.has(name)
    )
    
    // Validate last played track index
    let validTrackIndex = data.folderData.lastPlayedTrackIndex
    if (validTrackIndex < 0 || validTrackIndex >= currentFiles.length) {
      validTrackIndex = 0
    }
    
    // Filter track stats to only include existing tracks
    const validTrackStats: Record<string, TrackStats> = {}
    if (data.folderData.trackStats) {
      for (const [trackName, stats] of Object.entries(data.folderData.trackStats)) {
        if (currentTrackNames.has(trackName)) {
          validTrackStats[trackName] = stats
        }
      }
    }
    
    return {
      folderData: {
        ...data.folderData,
        favorites: validFavorites,
        lastPlayedTrackIndex: validTrackIndex,
        trackStats: validTrackStats,
      },
      globalHistory: data.globalHistory,
    }
  } catch (error) {
    console.error('Failed to parse import file:', error)
    return null
  }
}

// Create persistence hook
export function usePersistence() {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Debounced save to avoid excessive writes
  const debouncedSave = useCallback((saveFn: () => Promise<void>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(saveFn, 1000)
  }, [])
  
  // Save current state
  const saveState = useCallback(async (state: PersistenceState) => {
    const trackNames = state.files.map(f => f.name)
    const folderId = generateFolderId(state.folderName, trackNames)
    
    // Load existing data to preserve trackStats
    const existingData = await loadFolderData(folderId)
    
    const folderData: FolderData = {
      folderId,
      folderName: state.folderName,
      lastOpened: Date.now(),
      lastPlayedTrackIndex: state.currentIndex,
      lastPlayedPosition: state.currentTime,
      lastPlayedTimestamp: Date.now(),
      favorites: state.files.filter(f => f.liked).map(f => f.name),
      volume: state.volume,
      isShuffle: state.isShuffle,
      isRepeat: state.isRepeat,
      customPlaylists: existingData?.customPlaylists || [],
      recentlyPlayed: existingData?.recentlyPlayed || [],
      trackStats: existingData?.trackStats || {},
    }
    
    debouncedSave(async () => {
      await saveFolderData(folderData)
    })
  }, [debouncedSave])
  
  // Load saved state for a folder
  const loadState = useCallback(async (
    folderName: string,
    files: AudioFile[]
  ): Promise<Partial<FolderData> | null> => {
    const trackNames = files.map(f => f.name)
    const folderId = generateFolderId(folderName, trackNames)
    
    const data = await loadFolderData(folderId)
    if (!data) return null
    
    // Validate that saved track index is still valid
    if (data.lastPlayedTrackIndex >= files.length) {
      data.lastPlayedTrackIndex = 0
    }
    
    return data
  }, [])
  
  // Update recent folders list
  const updateRecentFolders = useCallback(async (folderId: string, folderName: string) => {
    const settings = await loadGlobalSettings() || {
      theme: 'dark',
      defaultVolume: 1,
      recentFolders: [],
    }
    
    // Remove if already exists
    settings.recentFolders = settings.recentFolders.filter(
      f => f.folderId !== folderId
    )
    
    // Add to beginning
    settings.recentFolders.unshift({
      folderId,
      folderName,
      lastOpened: Date.now(),
    })
    
    // Keep only last N
    settings.recentFolders = settings.recentFolders.slice(0, MAX_RECENT_FOLDERS)
    
    await saveGlobalSettings(settings)
  }, [])
  
  // Track a play
  const trackPlay = useCallback(async (
    folderName: string,
    files: AudioFile[],
    trackIndex: number,
    playTime: number = 0
  ) => {
    const trackNames = files.map(f => f.name)
    const folderId = generateFolderId(folderName, trackNames)
    const trackName = files[trackIndex]?.name
    if (!trackName) return
    
    // Update folder-specific track stats
    const folderData = await loadFolderData(folderId) || {
      folderId,
      folderName,
      lastOpened: Date.now(),
      lastPlayedTrackIndex: 0,
      lastPlayedPosition: 0,
      lastPlayedTimestamp: Date.now(),
      favorites: [],
      volume: 1,
      isShuffle: false,
      isRepeat: false,
      customPlaylists: [],
      recentlyPlayed: [],
      trackStats: {},
    }
    
    // Update track stats
    if (!folderData.trackStats) {
      folderData.trackStats = {}
    }
    
    if (!folderData.trackStats[trackName]) {
      folderData.trackStats[trackName] = {
        trackName,
        playCount: 0,
        queueCount: 0,
        lastPlayed: Date.now(),
      }
    }
    
    folderData.trackStats[trackName].playCount += 1
    folderData.trackStats[trackName].lastPlayed = Date.now()
    
    // Update recently played
    folderData.recentlyPlayed = folderData.recentlyPlayed.filter(name => name !== trackName)
    folderData.recentlyPlayed.unshift(trackName)
    folderData.recentlyPlayed = folderData.recentlyPlayed.slice(0, MAX_RECENTLY_PLAYED)
    
    await saveFolderData(folderData)
    
    // Update global history
    const globalHistory = await loadGlobalHistory() || {
      tracks: {},
      totalPlays: 0,
      lastUpdated: Date.now(),
    }
    
    const trackId = `${folderId}_${trackName}`
    if (!globalHistory.tracks[trackId]) {
      globalHistory.tracks[trackId] = {
        trackName,
        folderId,
        folderName,
        playCount: 0,
        totalPlayTime: 0,
        lastPlayed: Date.now(),
      }
    }
    
    globalHistory.tracks[trackId].playCount += 1
    globalHistory.tracks[trackId].totalPlayTime += playTime
    globalHistory.tracks[trackId].lastPlayed = Date.now()
    globalHistory.totalPlays += 1
    globalHistory.lastUpdated = Date.now()
    
    await saveGlobalHistory(globalHistory)
    
    return { folderData, globalHistory }
  }, [])
  
  // Track a queue
  const trackQueue = useCallback(async (
    folderName: string,
    files: AudioFile[],
    trackIndex: number
  ) => {
    const trackNames = files.map(f => f.name)
    const folderId = generateFolderId(folderName, trackNames)
    const trackName = files[trackIndex]?.name
    if (!trackName) return
    
    // Update folder-specific track stats
    const folderData = await loadFolderData(folderId)
    if (!folderData) return
    
    if (!folderData.trackStats) {
      folderData.trackStats = {}
    }
    
    if (!folderData.trackStats[trackName]) {
      folderData.trackStats[trackName] = {
        trackName,
        playCount: 0,
        queueCount: 0,
        lastPlayed: Date.now(),
      }
    }
    
    folderData.trackStats[trackName].queueCount += 1
    
    await saveFolderData(folderData)
    
    return folderData.trackStats[trackName]
  }, [])
  
  // Get track stats
  const getTrackStats = useCallback(async (
    folderName: string,
    files: AudioFile[]
  ): Promise<Record<string, TrackStats>> => {
    const trackNames = files.map(f => f.name)
    const folderId = generateFolderId(folderName, trackNames)
    
    const folderData = await loadFolderData(folderId)
    return folderData?.trackStats || {}
  }, [])
  
  // Get global history
  const getGlobalHistory = useCallback(async (): Promise<GlobalHistory> => {
    return await loadGlobalHistory() || {
      tracks: {},
      totalPlays: 0,
      lastUpdated: Date.now(),
    }
  }, [])
  
  // Apply imported data including global history
  const applyImportedData = useCallback(async (data: { folderData: Partial<FolderData>; globalHistory?: GlobalHistory }) => {
    if (data.globalHistory) {
      await saveGlobalHistory(data.globalHistory)
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])
  
  return {
    saveState,
    loadState,
    updateRecentFolders,
    trackPlay,
    trackQueue,
    getTrackStats,
    getGlobalHistory,
    exportFolderData,
    importFolderData,
    applyImportedData,
  }
}
