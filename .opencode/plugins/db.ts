import initSqlJs, { Database as SqlJsDatabase } from "sql.js"
import path from "path"
import fs from "fs"

export type MemoryType = "decision" | "note" | "bug" | "pattern" | "observation" | "conversation" | "diff"

export interface Memory {
  id?: number
  sessionId: string
  content: string
  type: MemoryType
  timestamp: number
}

export interface FileDiff {
  id?: number
  sessionId: string
  files: string[]
  timestamp: number
}

export interface MemoryStats {
  total: number
  sessions: number
  byType: Record<string, number>
  oldest: number | null
  newest: number | null
}

export class MemoryDB {
  private db!: SqlJsDatabase
  private dbPath: string
  private saveTimeout: NodeJS.Timeout | null = null

  constructor(directory: string) {
    const dataDir = path.join(directory, ".opencode", "mem")
    fs.mkdirSync(dataDir, { recursive: true })
    this.dbPath = path.join(dataDir, "memories.db")
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs()

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath)
      this.db = new SQL.Database(buffer)
    } else {
      this.db = new SQL.Database()
    }

    this.db.run("PRAGMA foreign_keys = ON;")
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        type        TEXT    NOT NULL DEFAULT 'observation',
        timestamp   INTEGER NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.db.run("CREATE INDEX IF NOT EXISTS idx_memories_ts ON memories (timestamp DESC)")
    this.db.run("CREATE INDEX IF NOT EXISTS idx_memories_type ON memories (type)")
    this.db.run("CREATE INDEX IF NOT EXISTS idx_memories_sid ON memories (session_id)")

    try {
      this.db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, content='memories', content_rowid='id')`)
      this.db.run(`CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content); END`)
      this.db.run(`CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.id, old.content); END`)
      this.db.run(`CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.id, old.content); INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content); END`)
    } catch { /* FTS may already exist */ }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS file_diffs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  TEXT    NOT NULL,
        files_json  TEXT    NOT NULL,
        timestamp   INTEGER NOT NULL
      )
    `)
    this.db.run("CREATE INDEX IF NOT EXISTS idx_diffs_sid ON file_diffs (session_id)")

    this.save()
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => {
      try {
        const data = this.db.export()
        const buffer = Buffer.from(data)
        fs.writeFileSync(this.dbPath, buffer)
      } catch (err) {
        console.error("[opencode-mem] Failed to save DB:", err)
      }
    }, 500)
  }

  saveMemory(memory: Memory): number {
    this.db.run("INSERT INTO memories (session_id, content, type, timestamp) VALUES (?, ?, ?, ?)", [
      memory.sessionId,
      memory.content,
      memory.type,
      memory.timestamp,
    ])
    const result = this.db.exec("SELECT last_insert_rowid() as id")
    this.save()
    return result[0]?.values[0]?.[0] as number ?? 0
  }

  getRecentMemories(limit: number): Memory[] {
    const result = this.db.exec(
      "SELECT id, session_id, content, type, timestamp FROM memories ORDER BY timestamp DESC LIMIT ?",
      [limit]
    )
    if (!result[0]) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      sessionId: row[1] as string,
      content: row[2] as string,
      type: row[3] as string,
      timestamp: row[4] as number,
    }))
  }

  getMemoriesByType(type: string, limit: number): Memory[] {
    const result = this.db.exec(
      "SELECT id, session_id, content, type, timestamp FROM memories WHERE type = ? ORDER BY timestamp DESC LIMIT ?",
      [type, limit]
    )
    if (!result[0]) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      sessionId: row[1] as string,
      content: row[2] as string,
      type: row[3] as string,
      timestamp: row[4] as number,
    }))
  }

  getAllMemories(): Memory[] {
    const result = this.db.exec(
      "SELECT id, session_id, content, type, timestamp FROM memories ORDER BY timestamp DESC"
    )
    if (!result[0]) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      sessionId: row[1] as string,
      content: row[2] as string,
      type: row[3] as string,
      timestamp: row[4] as number,
    }))
  }

  searchMemories(query: string, limit: number): Memory[] {
    const result = this.db.exec(
      "SELECT id, session_id, content, type, timestamp FROM memories WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?",
      [`%${query}%`, limit]
    )
    if (!result[0]) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      sessionId: row[1] as string,
      content: row[2] as string,
      type: row[3] as string,
      timestamp: row[4] as number,
    }))
  }

  deleteMemory(id: number): void {
    this.db.run("DELETE FROM memories WHERE id = ?", [id])
    this.save()
  }

  getStats(): MemoryStats {
    const total = this.db.exec("SELECT COUNT(*) FROM memories")
    const sessions = this.db.exec("SELECT COUNT(DISTINCT session_id) FROM memories")
    const byTypeRows = this.db.exec("SELECT type, COUNT(*) FROM memories GROUP BY type")
    const ts = this.db.exec("SELECT MIN(timestamp), MAX(timestamp) FROM memories")

    return {
      total: total[0]?.values[0]?.[0] as number ?? 0,
      sessions: sessions[0]?.values[0]?.[0] as number ?? 0,
      byType: Object.fromEntries(
        (byTypeRows[0]?.values ?? []).map((r) => [r[0] as string, r[1] as number])
      ),
      oldest: ts[0]?.values[0]?.[0] as number | null ?? null,
      newest: ts[0]?.values[0]?.[1] as number | null ?? null,
    }
  }

  saveFileDiff(diff: FileDiff): void {
    this.db.run("INSERT INTO file_diffs (session_id, files_json, timestamp) VALUES (?, ?, ?)", [
      diff.sessionId,
      JSON.stringify(diff.files),
      diff.timestamp,
    ])
    this.save()
  }

  getFileDiffsForSession(sessionId: string): FileDiff[] {
    const result = this.db.exec(
      "SELECT id, session_id, files_json, timestamp FROM file_diffs WHERE session_id = ? ORDER BY timestamp DESC",
      [sessionId]
    )
    if (!result[0]) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      sessionId: row[1] as string,
      files: JSON.parse(row[2] as string),
      timestamp: row[3] as number,
    }))
  }

  getAllFileDiffs(): FileDiff[] {
    const result = this.db.exec(
      "SELECT id, session_id, files_json, timestamp FROM file_diffs ORDER BY timestamp DESC"
    )
    if (!result[0]) return []
    return result[0].values.map((row) => ({
      id: row[0] as number,
      sessionId: row[1] as string,
      files: JSON.parse(row[2] as string),
      timestamp: row[3] as number,
    }))
  }
}
