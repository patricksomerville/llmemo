# LLM Meeting Recorder

## The Premise

Every conversation with an LLM is a meeting with a colleague. A smart, tireless colleague who helps you think, build, debug, write, and decide.

These "meetings" contain:
- Architectural decisions and their rationale
- Creative breakthroughs
- Debugging sessions that took hours
- Research and synthesis
- Code that works (and code that doesn't)
- Ideas you'll forget you had

Yet we treat them as throwaway chat logs.

## The Product

A universal recorder that treats every LLM conversation like a meeting worth preserving.

### Core Features

**1. Universal Capture**
- Browser extension for web UIs (claude.ai, chatgpt.com, gemini.google.com, poe.com)
- API proxy for programmatic access (intercepts OpenAI/Anthropic/etc calls)
- Desktop app hooks for native clients (Claude Desktop, Cursor, Windsurf)
- MCP server that logs all MCP-based interactions

**2. Meeting-Style Processing**
For each conversation:
- Auto-generated title (like a meeting subject)
- Participant identification (which model, which version)
- Duration and message count
- AI-generated summary (the "meeting notes")
- Extracted action items and decisions
- Key topics/tags
- Code snippets extracted and syntax-highlighted
- Links and references collected

**3. Search and Discovery**
- Full-text search across all conversations
- Semantic search ("that time I debugged the auth flow")
- Filter by model, date range, topic, project
- "Related conversations" suggestions
- Timeline view of all LLM interactions

**4. Session Replay**
- Read through conversations as they happened
- Jump to specific moments
- See what context you had at each point
- Export to markdown, PDF, or shareable link

**5. Cross-Session Intelligence**
- "You discussed this same problem 3 weeks ago with GPT-4"
- "Here's what you decided last time"
- "This contradicts what Claude told you on Tuesday"
- Build a knowledge graph from your LLM interactions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPTURE LAYER                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Browser Ext     │ API Proxy       │ Desktop Hooks           │
│ (Manifest V3)   │ (localhost:5001)│ (Tauri/Electron)        │
│                 │                 │                         │
│ - claude.ai     │ - OpenAI API    │ - Claude Desktop        │
│ - chatgpt.com   │ - Anthropic API │ - Cursor                │
│ - gemini.google │ - Ollama        │ - Windsurf              │
│ - poe.com       │ - Any OpenAI-   │ - VS Code + Continue    │
│ - huggingface   │   compatible    │ - Any Electron app      │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                 │                 │
         └────────────────┬┴─────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    INGESTION SERVICE                        │
│                                                             │
│  - Normalize message format across providers                │
│  - Deduplicate (same convo captured multiple ways)          │
│  - Extract metadata (model, timestamp, tokens)              │
│  - Chunk for embedding generation                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSING PIPELINE                      │
│                                                             │
│  1. Generate embeddings (local model or API)                │
│  2. Run summarization (async, can use local LLM)            │
│  3. Extract entities: code, links, decisions, actions       │
│  4. Auto-tag with topics                                    │
│  5. Link to related past conversations                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   SQLite     │  │    FAISS     │  │  Blob Store  │       │
│  │              │  │              │  │              │       │
│  │ - Sessions   │  │ - Embeddings │  │ - Raw logs   │       │
│  │ - Messages   │  │ - Semantic   │  │ - Exports    │       │
│  │ - Metadata   │  │   search     │  │ - Backups    │       │
│  │ - Tags       │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       UI LAYER                              │
│                                                             │
│  - Desktop app (Tauri - tiny, fast, cross-platform)         │
│  - Web interface (local, optional)                          │
│  - CLI for power users                                      │
│  - Quick search via hotkey (Spotlight-style)                │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

```sql
-- A conversation/session with an LLM
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,           -- 'anthropic', 'openai', 'google', etc
    model TEXT,                       -- 'claude-3-opus', 'gpt-4', etc
    source TEXT NOT NULL,             -- 'browser', 'api', 'desktop'
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    title TEXT,                       -- auto-generated or user-set
    summary TEXT,                     -- AI-generated meeting notes
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    project TEXT,                     -- optional grouping
    tags TEXT,                        -- JSON array
    metadata TEXT                     -- JSON blob for provider-specific data
);

-- Individual messages in a session
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,               -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    tokens INTEGER,
    model TEXT,                       -- can vary within session
    metadata TEXT                     -- JSON: tool calls, images, etc
);

-- Extracted artifacts from conversations
CREATE TABLE artifacts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    message_id TEXT REFERENCES messages(id),
    type TEXT NOT NULL,               -- 'code', 'decision', 'action', 'link', 'file'
    content TEXT NOT NULL,
    language TEXT,                    -- for code blocks
    metadata TEXT
);

-- Embeddings for semantic search
CREATE TABLE embeddings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    message_id TEXT REFERENCES messages(id),
    chunk_index INTEGER,
    embedding BLOB NOT NULL,          -- or store in FAISS separately
    text TEXT NOT NULL                -- the text that was embedded
);

-- Cross-session relationships
CREATE TABLE session_links (
    id TEXT PRIMARY KEY,
    source_session_id TEXT NOT NULL,
    target_session_id TEXT NOT NULL,
    link_type TEXT NOT NULL,          -- 'similar', 'continuation', 'contradicts', 'references'
    strength REAL,                    -- 0-1 similarity score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Capture Methods - Technical Details

### Browser Extension (Manifest V3)

```javascript
// content-script.js - injected into LLM chat pages

const SUPPORTED_SITES = {
  'claude.ai': {
    messageSelector: '[data-testid="message"]',
    inputSelector: 'textarea',
    observer: observeClaudeMessages
  },
  'chatgpt.com': {
    messageSelector: '[data-message-author-role]',
    inputSelector: '#prompt-textarea',
    observer: observeChatGPTMessages
  },
  // ... more providers
};

function captureMessage(role, content, metadata) {
  chrome.runtime.sendMessage({
    type: 'NEW_MESSAGE',
    payload: {
      provider: detectProvider(),
      role,
      content,
      timestamp: Date.now(),
      url: window.location.href,
      ...metadata
    }
  });
}

// MutationObserver to catch new messages as they stream in
function observeClaudeMessages() {
  const observer = new MutationObserver((mutations) => {
    // Detect new complete messages and capture them
  });
  // ...
}
```

### API Proxy

```python
# proxy.py - intercepts API calls and logs them

from fastapi import FastAPI, Request
from httpx import AsyncClient
import json

app = FastAPI()
client = AsyncClient()

ENDPOINTS = {
    'openai': 'https://api.openai.com',
    'anthropic': 'https://api.anthropic.com',
}

@app.api_route("/{provider}/{path:path}", methods=["GET", "POST"])
async def proxy(provider: str, path: str, request: Request):
    # Forward the request
    target_url = f"{ENDPOINTS[provider]}/{path}"

    body = await request.body()
    request_data = json.loads(body) if body else {}

    response = await client.request(
        method=request.method,
        url=target_url,
        headers=dict(request.headers),
        content=body
    )

    response_data = response.json()

    # Log to our database
    await log_interaction(
        provider=provider,
        endpoint=path,
        request=request_data,
        response=response_data,
        timestamp=datetime.now()
    )

    return response_data
```

### Desktop Hooks (for Claude Desktop, Cursor, etc.)

These apps store conversations locally. We can:
1. Watch their SQLite databases / JSON files for changes
2. Hook into their IPC if they use Electron
3. For Tauri apps, potentially hook into their webview

```rust
// file_watcher.rs - watch for changes to app data

use notify::{Watcher, RecursiveMode, watcher};
use std::path::Path;

fn watch_claude_desktop() {
    let path = dirs::data_dir()
        .unwrap()
        .join("Claude")
        .join("conversations");

    let mut watcher = watcher(tx, Duration::from_secs(2)).unwrap();
    watcher.watch(&path, RecursiveMode::Recursive).unwrap();

    // When files change, parse and ingest new messages
}
```

## Privacy and Security

**Local-first by default:**
- All data stored locally (SQLite + FAISS files)
- No cloud sync unless explicitly enabled
- Embeddings generated locally (via Ollama) or with your own API keys
- Summaries generated locally or with your keys

**Optional sync:**
- Encrypted backup to your own cloud storage
- Self-hosted sync server option
- Never touch our servers

**Sensitive data handling:**
- Automatic redaction of API keys, passwords (configurable)
- Exclude specific conversations
- Pause recording anytime

## MVP Scope

**Phase 1: Browser Extension + Local Storage**
- Chrome extension capturing claude.ai and chatgpt.com
- Local SQLite storage
- Basic search (full-text)
- Simple web UI to browse history

**Phase 2: API Proxy + Better Search**
- Proxy server for API calls
- Semantic search with local embeddings
- Auto-summarization
- Tags and projects

**Phase 3: Desktop Integration**
- Watch Claude Desktop, Cursor
- Hotkey for quick search
- Cross-session intelligence

**Phase 4: Native App**
- Tauri desktop app
- System tray
- Global hotkey
- Beautiful timeline UI

## Name Ideas

- **Recall** (taken by Microsoft, but...)
- **Logseq for LLMs** (vibe, not literal)
- **ConvoVault**
- **MeetingMind**
- **AIScribe**
- **ChatRecord**
- **Rewind.ai for LLMs**
- **LLMemo**
- **ThinkBack**
- **SessionKeeper**
- **DialogueDB**

## Why This Matters

1. **Institutional memory**: Your LLM conversations contain decisions, context, and reasoning that's lost when the chat window closes.

2. **Learning from yourself**: See patterns in how you work with AI. What prompts work? What doesn't?

3. **Continuity**: "Continue where we left off" actually works because you have the full history.

4. **Accountability**: When an LLM gives bad advice, you have the record.

5. **Research**: For people studying their own AI usage, or for teams analyzing how they use AI.

## Tech Stack (Proposed)

- **Capture**: Browser extension (TypeScript), Python proxy, Rust file watchers
- **Backend**: Rust or Python (FastAPI)
- **Database**: SQLite + FAISS (local), optional Postgres for self-hosted
- **Embeddings**: Ollama (local) or OpenAI API
- **Summarization**: Local LLM or Claude/GPT API
- **Desktop UI**: Tauri (Rust + Web)
- **Web UI**: SvelteKit or React

## Existing Components We Could Use

- [Dolphin Logger](https://github.com/cognitivecomputations/chat-logger) - API proxy concept
- [Screenpipe](https://github.com/mediar-ai/screenpipe) - capture architecture
- [Pluely](https://github.com/iamsrikanthnani/pluely) - Tauri app structure
- ByteRover Cipher - SQLite + FAISS pattern (already on this machine)

---

*Every conversation with an AI is a meeting. Start treating it like one.*
