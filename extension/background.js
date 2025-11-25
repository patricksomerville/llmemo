// LLMemo Background Service Worker
// Handles message storage and session management

const DB_NAME = 'llmemo';
const DB_VERSION = 1;

let db = null;

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Sessions store
      if (!database.objectStoreNames.contains('sessions')) {
        const sessionsStore = database.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('provider', 'provider', { unique: false });
        sessionsStore.createIndex('startedAt', 'startedAt', { unique: false });
        sessionsStore.createIndex('url', 'url', { unique: false });
      }

      // Messages store
      if (!database.objectStoreNames.contains('messages')) {
        const messagesStore = database.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        messagesStore.createIndex('role', 'role', { unique: false });
      }
    };
  });
}

// Generate unique ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session for current conversation
async function getOrCreateSession(provider, url, conversationId) {
  const sessionKey = `${provider}:${conversationId || url}`;

  // Check if we have an active session
  const stored = await chrome.storage.local.get(sessionKey);
  if (stored[sessionKey]) {
    return stored[sessionKey];
  }

  // Create new session
  const session = {
    id: generateId(),
    provider,
    url,
    conversationId,
    startedAt: new Date().toISOString(),
    messageCount: 0,
    title: null,
    summary: null
  };

  // Store in IndexedDB
  const tx = db.transaction('sessions', 'readwrite');
  await tx.objectStore('sessions').add(session);

  // Cache session key
  await chrome.storage.local.set({ [sessionKey]: session });

  return session;
}

// Save a message
async function saveMessage(sessionId, role, content, metadata = {}) {
  const message = {
    id: generateId(),
    sessionId,
    role,
    content,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  const tx = db.transaction('messages', 'readwrite');
  await tx.objectStore('messages').add(message);

  // Update session message count
  const sessionTx = db.transaction('sessions', 'readwrite');
  const sessionsStore = sessionTx.objectStore('sessions');
  const session = await new Promise(resolve => {
    sessionsStore.get(sessionId).onsuccess = e => resolve(e.target.result);
  });

  if (session) {
    session.messageCount = (session.messageCount || 0) + 1;
    session.lastMessageAt = message.timestamp;
    await sessionsStore.put(session);
  }

  return message;
}

// Get all sessions
async function getAllSessions() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly');
    const request = tx.objectStore('sessions').index('startedAt').getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
}

// Get messages for a session
async function getSessionMessages(sessionId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const index = tx.objectStore('messages').index('sessionId');
    const request = index.getAll(sessionId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Search messages
async function searchMessages(query) {
  const allMessages = await new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const request = tx.objectStore('messages').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const lowerQuery = query.toLowerCase();
  return allMessages.filter(m =>
    m.content && m.content.toLowerCase().includes(lowerQuery)
  );
}

// Get stats
async function getStats() {
  const sessions = await getAllSessions();
  const messageCount = await new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const request = tx.objectStore('messages').count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const providers = {};
  sessions.forEach(s => {
    providers[s.provider] = (providers[s.provider] || 0) + 1;
  });

  return {
    totalSessions: sessions.length,
    totalMessages: messageCount,
    byProvider: providers,
    oldestSession: sessions[sessions.length - 1]?.startedAt,
    newestSession: sessions[0]?.startedAt
  };
}

// Export all data
async function exportData() {
  const sessions = await getAllSessions();
  const allMessages = await new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const request = tx.objectStore('messages').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return {
    exportedAt: new Date().toISOString(),
    sessions,
    messages: allMessages
  };
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'NEW_MESSAGE': {
          const { provider, conversationId, url, role, content, metadata } = message.payload;
          const session = await getOrCreateSession(provider, url, conversationId);
          const saved = await saveMessage(session.id, role, content, metadata);
          sendResponse({ success: true, message: saved, session });
          break;
        }

        case 'GET_SESSIONS': {
          const sessions = await getAllSessions();
          sendResponse({ success: true, sessions });
          break;
        }

        case 'GET_SESSION_MESSAGES': {
          const messages = await getSessionMessages(message.sessionId);
          sendResponse({ success: true, messages });
          break;
        }

        case 'SEARCH': {
          const results = await searchMessages(message.query);
          sendResponse({ success: true, results });
          break;
        }

        case 'GET_STATS': {
          const stats = await getStats();
          sendResponse({ success: true, stats });
          break;
        }

        case 'EXPORT': {
          const data = await exportData();
          sendResponse({ success: true, data });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('LLMemo error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await initDB();
  console.log('LLMemo initialized');
});

// Initialize on startup
initDB().catch(console.error);
