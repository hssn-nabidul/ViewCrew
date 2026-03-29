import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { MemoryDB } from "./db"
import { compressObservations } from "./compress"
import { startWebViewer } from "./viewer"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Observation {
  sessionId: string
  tool: string
  input: unknown
  output: unknown
  timestamp: number
}

interface SessionMessage {
  sessionId: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

// ─── State ────────────────────────────────────────────────────────────────────
const observationQueue: Observation[] = []
const messageQueue: SessionMessage[] = []

// Track ALL tools by default
const TRACKED_TOOLS = new Set<string>([
  "bash", "write", "edit", "read",
  "glob", "grep", "patch", "create",
  "question", "task", "websearch", "webfetch",
  "codesearch", "stitch_*", "memory_*",
])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMemoriesForContext(memories: ReturnType<MemoryDB["getRecentMemories"]>) {
  return memories
    .map((m) => `- [${new Date(m.timestamp).toLocaleDateString()} | ${m.type}] ${m.content}`)
    .join("\n")
}

function truncateOutput(output: unknown, maxLen = 500): string {
  const str = typeof output === "string" ? output : JSON.stringify(output)
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str
}

function drainQueue<T>(queue: T[], sessionId: string): T[] {
  const pending = queue.filter((o) => (o as any).sessionId === sessionId)
  const idxs = queue.reduce<number[]>(
    (acc, o, i) => ((o as any).sessionId === sessionId ? [...acc, i] : acc),
    []
  )
  idxs.reverse().forEach((i) => queue.splice(i, 1))
  return pending
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
export const OpenCodeMem: Plugin = async ({ client, directory }) => {
  const db = new MemoryDB(directory)
  await db.init()

  // Start web viewer on port 47777
  const viewer = startWebViewer(db, directory)

  await client.app.log({
    body: {
      service: "opencode-mem",
      level: "info",
      message: `Memory plugin initialized | DB: ${directory}/.opencode/mem/memories.db | Viewer: http://localhost:47777`,
    },
  })

  return {
    // ── 1. Session created → inject recent memories ───────────────────────────
    "session.created": async (event: any) => {
      const sessionId = event?.session?.id ?? event?.id
      if (!sessionId) return

      const recentMemories = db.getRecentMemories(20)
      if (recentMemories.length === 0) return

      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text: [
                "## 🧠 opencode-mem — Persistent Memory",
                "",
                "The following context was loaded from your memory store.",
                "Use it to inform your work in this session:",
                "",
                formatMemoriesForContext(recentMemories),
                "",
                "---",
                `_${recentMemories.length} memories loaded. Browse all at http://localhost:47777_`,
              ].join("\n"),
            },
          ],
        },
      })

      await client.app.log({
        body: {
          service: "opencode-mem",
          level: "info",
          message: `Injected ${recentMemories.length} memories into session ${sessionId}`,
        },
      })
    },

    // ── 2. Tool executed → queue observation ──────────────────────────────────
    "tool.execute.after": async (input: any, output: any) => {
      // Track ALL tools
      const toolName = input?.tool ?? "unknown"
      
      observationQueue.push({
        sessionId: input.sessionId ?? "unknown",
        tool: toolName,
        input: input.args,
        output: truncateOutput(output),
        timestamp: Date.now(),
      })
    },

    // ── 3. Session message → queue user/assistant messages ────────────────────
    "session.message": async (event: any) => {
      const sessionId = event?.session?.id ?? event?.id
      if (!sessionId) return

      const role = event?.role ?? "user"
      const content = event?.content ?? event?.text ?? ""
      if (!content) return

      // Only track meaningful messages (not system prompts)
      if (role === "user" || role === "assistant") {
        messageQueue.push({
          sessionId,
          role,
          content: truncateOutput(content, 1000),
          timestamp: Date.now(),
        })
      }
    },

    // ── 4. Session diff → capture file changes ────────────────────────────────
    "session.diff": async (event: any) => {
      const sessionId = event?.session?.id ?? event?.id
      const diff = event?.diff as Record<string, { status: string; additions?: number; deletions?: number }> | undefined
      if (!sessionId || !diff) return

      const changed = Object.entries(diff)
        .filter(([, info]) => info.status !== "unmodified")
        .map(([file, info]) => {
          const adds = info.additions ?? 0
          const dels = info.deletions ?? 0
          return `${info.status}: ${file}${adds || dels ? ` (+${adds}/-${dels})` : ""}`
        })

      if (changed.length === 0) return

      db.saveFileDiff({
        sessionId,
        files: changed,
        timestamp: Date.now(),
      })

      await client.app.log({
        body: {
          service: "opencode-mem",
          level: "info",
          message: `Captured diff: ${changed.length} file(s) changed in session ${sessionId}`,
        },
      })
    },

    // ── 5. Session idle → compress + persist everything ───────────────────────
    "session.idle": async (event: any) => {
      const sessionId = event?.session?.id ?? event?.id
      if (!sessionId) return

      const pendingObs = drainQueue(observationQueue, sessionId)
      const pendingMsgs = drainQueue(messageQueue, sessionId)

      // Skip if nothing to save
      if (pendingObs.length === 0 && pendingMsgs.length === 0) return

      try {
        // Compress and save tool observations
        if (pendingObs.length > 0) {
          const compressed = await compressObservations(pendingObs, directory, client)
          if (compressed) {
            db.saveMemory({
              sessionId,
              content: compressed,
              type: "observation",
              timestamp: Date.now(),
            })
          }
        }

        // Save session messages as conversation summary
        if (pendingMsgs.length > 0) {
          const userMsgs = pendingMsgs.filter((m) => m.role === "user")
          const assistantMsgs = pendingMsgs.filter((m) => m.role === "assistant")

          let content = `## Conversation Summary\n\n`
          content += `**${userMsgs.length} user messages**, **${assistantMsgs.length} assistant responses**\n\n`

          // Summarize key user requests
          if (userMsgs.length > 0) {
            const recentUserMsgs = userMsgs.slice(-3)
            content += `### Recent User Requests:\n`
            recentUserMsgs.forEach((m, i) => {
              const preview = m.content.slice(0, 200)
              content += `${i + 1}. ${preview}${m.content.length > 200 ? "..." : ""}\n`
            })
            content += `\n`
          }

          // Summarize key actions taken
          const toolsUsed = pendingObs.slice(-10).map((o) => o.tool)
          const uniqueTools = [...new Set(toolsUsed)]
          if (uniqueTools.length > 0) {
            content += `### Tools Used:\n${uniqueTools.join(", ")}\n\n`
          }

          db.saveMemory({
            sessionId,
            content,
            type: "conversation",
            timestamp: Date.now(),
          })
        }

        // Also attach any file diff recorded for this session
        const diffs = db.getFileDiffsForSession(sessionId)
        if (diffs.length > 0) {
          const diffSummary = diffs.flatMap((d) => d.files).join(", ")
          db.saveMemory({
            sessionId,
            content: `Files changed this session: ${diffSummary}`,
            type: "diff",
            timestamp: Date.now() + 1,
          })
        }

        await client.tui.showToast({
          body: { message: `🧠 Saved ${pendingObs.length} actions, ${pendingMsgs.length} messages`, variant: "success" },
        })
      } catch (err) {
        await client.app.log({
          body: {
            service: "opencode-mem",
            level: "error",
            message: `Memory compression failed: ${String(err)}`,
          },
        })
      }
    },

    // ── 6. Session ending → final save ─────────────────────────────────────────
    "session.ended": async (event: any) => {
      const sessionId = event?.session?.id ?? event?.id
      if (!sessionId) return

      // Final save of any remaining items
      const pendingObs = drainQueue(observationQueue, sessionId)
      const pendingMsgs = drainQueue(messageQueue, sessionId)

      if (pendingObs.length > 0 || pendingMsgs.length > 0) {
        try {
          if (pendingObs.length > 0) {
            const compressed = await compressObservations(pendingObs, directory, client)
            if (compressed) {
              db.saveMemory({
                sessionId,
                content: compressed,
                type: "observation",
                timestamp: Date.now(),
              })
            }
          }

          await client.app.log({
            body: {
              service: "opencode-mem",
              level: "info",
              message: `Session ended: saved ${pendingObs.length} obs, ${pendingMsgs.length} msgs`,
            },
          })
        } catch (err) {
          console.error("[opencode-mem] Final save failed:", err)
        }
      }
    },

    // ── 7. Compaction → inject memories into summary context ──────────────────
    "experimental.session.compacting": async (_input: any, output: any) => {
      const memories = db.getRecentMemories(10)
      if (memories.length === 0) return
      output.context.push(
        [
          "## Persistent Memory (opencode-mem)",
          "Preserve the following context across this compaction:",
          "",
          formatMemoriesForContext(memories),
        ].join("\n")
      )
    },

    // ── 8. Custom tools ────────────────────────────────────────────────────────
    tool: {
      memory_search: tool({
        description:
          "Search your persistent memory store for past decisions, bugs, patterns, and observations.",
        args: {
          query: tool.schema.string().describe("Search query"),
          limit: tool.schema.number().optional().describe("Max results (default: 5)"),
        },
        async execute(args) {
          const results = db.searchMemories(args.query, args.limit ?? 5)
          if (results.length === 0) return "No memories found matching your query."
          return results
            .map(
              (m, i) =>
                `[${i + 1}] #${m.id} 📅 ${new Date(m.timestamp).toLocaleDateString()} [${m.type}]\n${m.content}`
            )
            .join("\n\n")
        },
      }),

      memory_save: tool({
        description:
          "Manually save an important memory — a decision, bug, note, or pattern.",
        args: {
          content: tool.schema.string().describe("The memory content to save"),
          type: tool.schema
            .enum(["decision", "note", "bug", "pattern", "observation", "conversation", "diff"])
            .optional()
            .describe("Memory type (default: note)"),
        },
        async execute(args) {
          db.saveMemory({
            sessionId: "manual",
            content: args.content,
            type: args.type ?? "note",
            timestamp: Date.now(),
          })
          return "✅ Memory saved."
        },
      }),

      memory_timeline: tool({
        description: "Browse a chronological timeline of all past memories.",
        args: {
          limit: tool.schema.number().optional().describe("Entries to show (default: 20)"),
          type: tool.schema
            .enum(["decision", "note", "bug", "pattern", "observation", "conversation", "diff"])
            .optional()
            .describe("Filter by type"),
        },
        async execute(args) {
          const memories = args.type
            ? db.getMemoriesByType(args.type, args.limit ?? 20)
            : db.getRecentMemories(args.limit ?? 20)
          if (memories.length === 0) return "No memories recorded yet."
          return memories
            .map(
              (m) =>
                `#${m.id} 📅 ${new Date(m.timestamp).toLocaleString()} [${m.type}]\n${
                  m.content.length > 300 ? m.content.slice(0, 300) + "..." : m.content
                }`
            )
            .join("\n\n---\n\n")
        },
      }),

      memory_delete: tool({
        description: "Delete a specific memory by ID.",
        args: {
          id: tool.schema.number().describe("Memory ID to delete"),
        },
        async execute(args) {
          db.deleteMemory(args.id)
          return `🗑️ Memory #${args.id} deleted.`
        },
      }),

      memory_stats: tool({
        description:
          "Show statistics about your memory store — total count, breakdown by type, sessions tracked, and recent activity.",
        args: {},
        async execute() {
          const stats = db.getStats()
          const lines = [
            "## 🧠 Memory Store Stats",
            "",
            `Total memories:  ${stats.total}`,
            `Sessions tracked: ${stats.sessions}`,
            `Oldest memory:   ${stats.oldest ? new Date(stats.oldest).toLocaleDateString() : "—"}`,
            `Newest memory:   ${stats.newest ? new Date(stats.newest).toLocaleDateString() : "—"}`,
            "",
            "Breakdown by type:",
            ...Object.entries(stats.byType).map(
              ([type, count]) => `  ${type.padEnd(14)} ${count}`
            ),
            "",
            `Web viewer: http://localhost:47777`,
          ]
          return lines.join("\n")
        },
      }),

      memory_all: tool({
        description: "List all memories with full content.",
        args: {
          limit: tool.schema.number().optional().describe("Max results (default: 50)"),
        },
        async execute(args) {
          const memories = db.getRecentMemories(args.limit ?? 50)
          if (memories.length === 0) return "No memories recorded yet."
          return memories
            .map(
              (m, i) =>
                `[${i + 1}] #${m.id} 📅 ${new Date(m.timestamp).toLocaleString()} [${m.type}]\n${m.content}`
            )
            .join("\n\n---\n\n")
        },
      }),
    },
  }
}
