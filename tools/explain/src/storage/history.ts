const STORAGE_KEY = 'reliadb-explain-history'
const MAX_ENTRIES = 50

export interface HistoryEntry {
  id: string
  title: string
  explain: string
  query?: string
  ddl?: string
  format: string
  createdAt: string
  issueCount: number
  score: number
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry {
  const history = loadHistory()

  const newEntry: HistoryEntry = {
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
  }

  history.unshift(newEntry)

  // Evict oldest if over limit
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // localStorage full — evict half
    history.length = Math.floor(MAX_ENTRIES / 2)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }

  return newEntry
}

export function deleteFromHistory(id: string): void {
  const history = loadHistory().filter(e => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
