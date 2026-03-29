import http from "node:http"
import type { MemoryDB } from "./db"

const PORT = 47777

function html(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>opencode-mem</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #3fb950; --yellow: #d29922; --red: #f85149;
      --purple: #bc8cff; --orange: #ffa657;
    }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-size: 14px; line-height: 1.6; min-height: 100vh; }
    header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 14px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
    header h1 { font-size: 16px; font-weight: 600; }
    header .badge { background: var(--accent); color: #000; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
    header .spacer { flex: 1; }
    header a { color: var(--muted); text-decoration: none; font-size: 12px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 6px; }
    header a:hover { color: var(--text); border-color: var(--accent); }
    .layout { display: grid; grid-template-columns: 220px 1fr; min-height: calc(100vh - 53px); }
    .sidebar { background: var(--surface); border-right: 1px solid var(--border); padding: 16px 0; }
    .sidebar nav a { display: flex; align-items: center; gap: 8px; padding: 8px 20px; color: var(--muted); text-decoration: none; font-size: 13px; border-left: 2px solid transparent; }
    .sidebar nav a:hover, .sidebar nav a.active { color: var(--text); background: rgba(88,166,255,.07); border-left-color: var(--accent); }
    .sidebar-section { padding: 16px 20px 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
    .stat-pill { margin-left: auto; background: var(--border); color: var(--muted); font-size: 11px; padding: 1px 7px; border-radius: 12px; }
    main { padding: 28px 32px; }
    .page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; }
    .stat-card .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: var(--accent); margin-top: 4px; }
    .stat-card .sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .search-bar { display: flex; gap: 8px; margin-bottom: 20px; }
    .search-bar input { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 8px 14px; font-size: 13px; outline: none; }
    .search-bar input:focus { border-color: var(--accent); }
    .search-bar button { background: var(--accent); color: #000; border: none; border-radius: 8px; padding: 8px 18px; font-weight: 600; cursor: pointer; font-size: 13px; }
    .search-bar button:hover { opacity: .85; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; color: var(--muted); padding: 4px 14px; font-size: 12px; cursor: pointer; text-decoration: none; }
    .filter-btn:hover, .filter-btn.active { border-color: var(--accent); color: var(--accent); }
    .memory-list { display: flex; flex-direction: column; gap: 12px; }
    .memory-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; transition: border-color .15s; }
    .memory-card:hover { border-color: var(--accent); }
    .memory-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .memory-id { color: var(--muted); font-size: 12px; font-family: monospace; }
    .type-badge { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; text-transform: uppercase; letter-spacing: .04em; }
    .memory-date { color: var(--muted); font-size: 12px; margin-left: auto; }
    .memory-content { color: var(--text); line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
    .memory-session { margin-top: 10px; font-size: 11px; color: var(--muted); font-family: monospace; }
    .diff-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; }
    .diff-card .diff-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .diff-card .diff-session { font-family: monospace; font-size: 12px; color: var(--accent); }
    .diff-card .diff-date { margin-left: auto; font-size: 12px; color: var(--muted); }
    .diff-card ul { list-style: none; padding-left: 4px; }
    .diff-card ul li { font-size: 12px; font-family: monospace; padding: 2px 0; color: var(--muted); }
    .diff-card ul li::before { content: "→ "; color: var(--green); }
    .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
    .empty .icon { font-size: 40px; margin-bottom: 12px; }
    .type-observation { background: rgba(88,166,255,.15); color: var(--accent); }
    .type-decision { background: rgba(63,185,80,.15); color: var(--green); }
    .type-bug { background: rgba(248,81,73,.15); color: var(--red); }
    .type-note { background: rgba(210,153,34,.15); color: var(--yellow); }
    .type-pattern { background: rgba(188,140,255,.15); color: var(--purple); }
    .type-diff { background: rgba(255,166,87,.15); color: var(--orange); }
    .type-conversation { background: rgba(255,166,255,.15); color: #ff66ff; }
  </style>
</head>
<body>
${content}
</body>
</html>`
}

function typeBadge(type: string) {
  return `<span class="type-badge type-${type}">${type}</span>`
}

function buildLayout(db: MemoryDB, pageContent: string, activeNav: string) {
  const stats = db.getStats()
  const navLinks = [
    { href: "/", icon: "🏠", label: "Overview", count: undefined },
    { href: "/memories", icon: "🧠", label: "All Memories", count: stats.total },
    { href: "/search", icon: "🔍", label: "Search", count: undefined },
    { href: "/diffs", icon: "📁", label: "File Diffs", count: undefined },
    { href: "/timeline", icon: "📅", label: "Timeline", count: undefined },
  ]

  const typeLinks = Object.entries(stats.byType).map(([type, count]) => ({
    href: `/memories?type=${type}`,
    icon: "·",
    label: type,
    count,
  }))

  const nav = navLinks
    .map((l) => `<a href="${l.href}" class="${activeNav === l.href ? "active" : ""}"><span>${l.icon}</span> ${l.label}${l.count !== undefined ? `<span class="stat-pill">${l.count}</span>` : ""}</a>`)
    .join("")

  const typeNav = typeLinks.length > 0
    ? `<div class="sidebar-section">By Type</div>` + typeLinks.map((l) => `<a href="${l.href}" class="${activeNav === l.href ? "active" : ""}"><span>${l.icon}</span> ${l.label}<span class="stat-pill">${l.count}</span></a>`).join("")
    : ""

  return html(`<header><span style="font-size:20px">🧠</span><h1>opencode-mem</h1><span class="badge">v0.2</span><span class="spacer"></span><a href="/api/memories" target="_blank">JSON API</a></header><div class="layout"><aside class="sidebar"><nav>${nav}${typeNav}</nav></aside><main>${pageContent}</main></div>`)
}

function overviewPage(db: MemoryDB) {
  const stats = db.getStats()
  const recent = db.getRecentMemories(5)

  const statCards = [
    { label: "Total Memories", value: stats.total, sub: "across all sessions" },
    { label: "Sessions", value: stats.sessions, sub: "unique sessions tracked" },
    { label: "Oldest", value: stats.oldest ? new Date(stats.oldest).toLocaleDateString() : "—", sub: "first memory" },
    { label: "Newest", value: stats.newest ? new Date(stats.newest).toLocaleDateString() : "—", sub: "latest memory" },
  ].map((c) => `<div class="stat-card"><div class="label">${c.label}</div><div class="value">${c.value}</div><div class="sub">${c.sub}</div></div>`).join("")

  const recentCards = recent.length === 0
    ? `<div class="empty"><div class="icon">📭</div><p>No memories yet. Start a session!</p></div>`
    : recent.map((m) => `<div class="memory-card"><div class="memory-header"><span class="memory-id">#${m.id}</span>${typeBadge(m.type)}<span class="memory-date">${new Date(m.timestamp).toLocaleString()}</span></div><div class="memory-content">${escHtml(m.content)}</div><div class="memory-session">session: ${m.sessionId}</div></div>`).join("")

  return buildLayout(db, `<div class="page-title">🏠 Overview</div><div class="stats-grid">${statCards}</div><div class="page-title" style="font-size:16px;margin-top:8px">Recent Memories</div><div class="memory-list">${recentCards}</div>`, "/")
}

function memoriesPage(db: MemoryDB, type?: string) {
  const memories = type ? db.getMemoriesByType(type, 100) : db.getRecentMemories(100)

  const cards = memories.length === 0
    ? `<div class="empty"><div class="icon">🔍</div><p>No memories found.</p></div>`
    : memories.map((m) => `<div class="memory-card"><div class="memory-header"><span class="memory-id">#${m.id}</span>${typeBadge(m.type)}<span class="memory-date">${new Date(m.timestamp).toLocaleString()}</span></div><div class="memory-content">${escHtml(m.content)}</div><div class="memory-session">session: ${m.sessionId}</div></div>`).join("")

  const typeFilters = ["observation", "decision", "bug", "note", "pattern", "diff"].map((t) => `<a href="/memories?type=${t}" class="filter-btn ${type === t ? "active" : ""}">${t}</a>`).join("")

  return buildLayout(db, `<div class="page-title">🧠 Memories ${memories.length > 0 ? `<span style="font-size:14px;color:var(--muted)">(${memories.length})</span>` : ""}</div><div class="filters"><a href="/memories" class="filter-btn ${!type ? "active" : ""}">all</a>${typeFilters}</div><div class="memory-list">${cards}</div>`, type ? `/memories?type=${type}` : "/memories")
}

function searchPage(db: MemoryDB, query?: string) {
  const results = query ? db.searchMemories(query, 50) : []

  const cards = query && results.length === 0
    ? `<div class="empty"><div class="icon">🔍</div><p>No results for "${escHtml(query)}".</p></div>`
    : results.map((m) => `<div class="memory-card"><div class="memory-header"><span class="memory-id">#${m.id}</span>${typeBadge(m.type)}<span class="memory-date">${new Date(m.timestamp).toLocaleString()}</span></div><div class="memory-content">${escHtml(m.content)}</div><div class="memory-session">session: ${m.sessionId}</div></div>`).join("")

  return buildLayout(db, `<div class="page-title">🔍 Search</div><form class="search-bar" method="GET" action="/search"><input name="q" value="${escHtml(query ?? "")}" placeholder="Search memories…" autofocus /><button type="submit">Search</button></form><div class="memory-list">${cards}</div>`, "/search")
}

function diffsPage(db: MemoryDB) {
  const diffs = db.getAllFileDiffs()

  const cards = diffs.length === 0
    ? `<div class="empty"><div class="icon">📁</div><p>No file diffs recorded yet.</p></div>`
    : diffs.map((d) => `<div class="diff-card"><div class="diff-header"><span>📁</span><span class="diff-session">${d.sessionId.slice(0, 12)}…</span><span class="diff-date">${new Date(d.timestamp).toLocaleString()}</span></div><ul>${d.files.map((f) => `<li>${escHtml(f)}</li>`).join("")}</ul></div>`).join("")

  return buildLayout(db, `<div class="page-title">📁 File Diffs</div>${cards}`, "/diffs")
}

function timelinePage(db: MemoryDB) {
  const memories = db.getRecentMemories(200)

  const grouped: Record<string, typeof memories> = {}
  for (const m of memories) {
    const day = new Date(m.timestamp).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    ;(grouped[day] ??= []).push(m)
  }

  const sections = Object.entries(grouped).map(([day, items]) => `<div style="margin-bottom:28px"><div style="font-size:13px;font-weight:600;color:var(--muted);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">${day}</div><div class="memory-list">${items.map((m) => `<div class="memory-card"><div class="memory-header"><span class="memory-id">#${m.id}</span>${typeBadge(m.type)}<span class="memory-date">${new Date(m.timestamp).toLocaleTimeString()}</span></div><div class="memory-content">${escHtml(m.content)}</div></div>`).join("")}</div></div>`).join("")

  return buildLayout(db, `<div class="page-title">📅 Timeline</div>${sections || `<div class="empty"><div class="icon">📅</div><p>No memories yet.</p></div>`}`, "/timeline")
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function startWebViewer(db: MemoryDB, _directory: string) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`)
    const params = url.searchParams

    const setJson = () => { res.setHeader("Content-Type", "application/json") }
    const setHtml = () => { res.setHeader("Content-Type", "text/html; charset=utf-8") }
    const send = (body: string | object, status = 200, type = "html") => {
      res.writeHead(status, type === "json" ? { "Content-Type": "application/json" } : { "Content-Type": "text/html; charset=utf-8" })
      res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2))
    }

    try {
      if (url.pathname === "/api/memories") { setJson(); return send(db.getAllMemories()) }
      if (url.pathname === "/api/stats") { setJson(); return send(db.getStats()) }
      if (url.pathname === "/api/diffs") { setJson(); return send(db.getAllFileDiffs()) }
      if (url.pathname === "/") { setHtml(); return send(overviewPage(db)) }
      if (url.pathname === "/memories") { setHtml(); return send(memoriesPage(db, params.get("type") ?? undefined)) }
      if (url.pathname === "/search") { setHtml(); return send(searchPage(db, params.get("q") ?? undefined)) }
      if (url.pathname === "/diffs") { setHtml(); return send(diffsPage(db)) }
      if (url.pathname === "/timeline") { setHtml(); return send(timelinePage(db)) }
      send("Not Found", 404)
    } catch (err) {
      console.error("[opencode-mem] Server error:", err)
      send("Internal Server Error", 500)
    }
  })

  server.listen(PORT, () => {
    console.log(`[opencode-mem] Web viewer running at http://localhost:${PORT}`)
  })

  return server
}
