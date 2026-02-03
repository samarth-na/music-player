import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { FolderData, GlobalSettings, GlobalHistory } from './types'

const DB_NAME = 'elevenmusic-db'
const DB_VERSION = 2

interface ElevenMusicDB extends DBSchema {
  folders: {
    key: string
    value: FolderData
  }
  settings: {
    key: string
    value: GlobalSettings
  }
  globalHistory: {
    key: string
    value: GlobalHistory
  }
}

let db: IDBPDatabase<ElevenMusicDB> | null = null

// Initialize the database
export async function initDB(): Promise<IDBPDatabase<ElevenMusicDB>> {
  if (db) return db

  db = await openDB<ElevenMusicDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      // Create stores if they don't exist
      if (!database.objectStoreNames.contains('folders')) {
        database.createObjectStore('folders', { keyPath: 'folderId' })
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings')
      }
      if (!database.objectStoreNames.contains('globalHistory')) {
        database.createObjectStore('globalHistory')
      }
    },
  })

  return db
}

// Generate a unique folder ID from folder name and track list
export function generateFolderId(folderName: string, trackNames: string[]): string {
  // Create a hash from folder name + sorted track names
  const sortedTracks = [...trackNames].sort().join('|')
  const hashInput = `${folderName}::${sortedTracks}`
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return `folder_${Math.abs(hash).toString(36)}`
}

// Save folder data
export async function saveFolderData(data: FolderData): Promise<void> {
  const database = await initDB()
  await database.put('folders', data)
}

// Load folder data
export async function loadFolderData(folderId: string): Promise<FolderData | undefined> {
  const database = await initDB()
  return database.get('folders', folderId)
}

// Save global settings
export async function saveGlobalSettings(settings: GlobalSettings): Promise<void> {
  const database = await initDB()
  await database.put('settings', settings, 'global')
}

// Load global settings
export async function loadGlobalSettings(): Promise<GlobalSettings | undefined> {
  const database = await initDB()
  return database.get('settings', 'global')
}

// Save global history
export async function saveGlobalHistory(history: GlobalHistory): Promise<void> {
  const database = await initDB()
  await database.put('globalHistory', history, 'global')
}

// Load global history
export async function loadGlobalHistory(): Promise<GlobalHistory | undefined> {
  const database = await initDB()
  return database.get('globalHistory', 'global')
}

// Get all saved folders
export async function getAllFolders(): Promise<FolderData[]> {
  const database = await initDB()
  return database.getAll('folders')
}

// Delete folder data
export async function deleteFolderData(folderId: string): Promise<void> {
  const database = await initDB()
  await database.delete('folders', folderId)
}

// Clear all data (for debugging/reset)
export async function clearAllData(): Promise<void> {
  const database = await initDB()
  await database.clear('folders')
  await database.clear('settings')
  await database.clear('globalHistory')
}
