export interface TrackStats {
  trackName: string
  playCount: number
  queueCount: number
  lastPlayed: number
}

export interface FolderData {
  folderId: string
  folderName: string
  lastOpened: number

  // Playback State
  lastPlayedTrackIndex: number
  lastPlayedPosition: number
  lastPlayedTimestamp: number

  // User Preferences
  favorites: string[] // Array of track file names
  volume: number
  isShuffle: boolean
  isRepeat: boolean

  // Playlists
  customPlaylists: {
    name: string
    tracks: string[] // Track file names
    createdAt: number
  }[]

  // Play History (last 50)
  recentlyPlayed: string[]

  // Track statistics
  trackStats: Record<string, TrackStats> // trackName -> stats
}

export interface GlobalTrackHistory {
  trackName: string
  folderId: string
  folderName: string
  playCount: number
  totalPlayTime: number // in seconds
  lastPlayed: number
}

export interface GlobalHistory {
  tracks: Record<string, GlobalTrackHistory> // trackId (folderId_trackName) -> history
  totalPlays: number
  lastUpdated: number
}

export interface GlobalSettings {
  theme: 'dark' | 'light' | 'system'
  defaultVolume: number
  recentFolders: {
    folderId: string
    folderName: string
    lastOpened: number
  }[]
}

// JSON file format for export/import
export interface ExportData {
  version: string
  exportedAt: number
  folderData: FolderData
  globalHistory: GlobalHistory
}

// Audio file with metadata
export interface AudioFile {
  id: string
  name: string
  src: string
  duration?: number
  liked?: boolean
  // Metadata (optional, for future expansion)
  artist?: string
  album?: string
  year?: string
}
