// LLMemo Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    sessionCount: document.getElementById('sessionCount'),
    messageCount: document.getElementById('messageCount'),
    todayCount: document.getElementById('todayCount'),
    sessionsList: document.getElementById('sessionsList'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    exportBtn: document.getElementById('exportBtn'),
    sessionDetail: document.getElementById('sessionDetail'),
    backBtn: document.getElementById('backBtn'),
    detailTitle: document.getElementById('detailTitle'),
    detailMeta: document.getElementById('detailMeta'),
    messagesContainer: document.getElementById('messagesContainer'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    settingsBtn: document.getElementById('settingsBtn'),
    status: document.getElementById('status'),
    statusDot: document.querySelector('.status-dot')
  };

  // Settings button
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', () => {
      window.location.href = 'settings.html';
    });
  }

  // Load and display recording status
  async function loadRecordingStatus() {
    const settings = await chrome.storage.local.get(['recordingEnabled']);
    const isRecording = settings.recordingEnabled !== false;

    if (elements.status) {
      elements.status.innerHTML = isRecording
        ? '<span class="status-dot active"></span> Recording'
        : '<span class="status-dot"></span> Paused';
    }
  }

  // Toggle recording on status click
  if (elements.status) {
    elements.status.style.cursor = 'pointer';
    elements.status.addEventListener('click', async () => {
      const settings = await chrome.storage.local.get(['recordingEnabled']);
      const newValue = settings.recordingEnabled === false;
      await chrome.storage.local.set({ recordingEnabled: newValue });
      loadRecordingStatus();
    });
  }

  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;

      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
      });
    });
  });

  // Load stats
  async function loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response.success) {
        const { totalSessions, totalMessages, byProvider } = response.stats;
        elements.sessionCount.textContent = totalSessions || 0;
        elements.messageCount.textContent = totalMessages || 0;
        elements.todayCount.textContent = '0'; // TODO: calculate today's count
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Format relative time
  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // Get provider icon letter and class
  function getProviderInfo(provider) {
    const providers = {
      claude: { letter: 'C', class: 'claude', name: 'Claude' },
      anthropic: { letter: 'C', class: 'claude', name: 'Claude' },
      openai: { letter: 'G', class: 'openai', name: 'ChatGPT' },
      google: { letter: 'G', class: 'google', name: 'Gemini' }
    };
    return providers[provider] || { letter: '?', class: '', name: provider };
  }

  // Generate session title from first message
  function generateTitle(session, messages) {
    if (session.title) return session.title;

    // Find first user message
    const firstUserMessage = messages?.find(m => m.role === 'user');
    if (firstUserMessage) {
      const text = firstUserMessage.content.slice(0, 50);
      return text + (firstUserMessage.content.length > 50 ? '...' : '');
    }

    return 'Untitled conversation';
  }

  // Load and display sessions
  async function loadSessions() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });

      if (!response.success || !response.sessions.length) {
        elements.sessionsList.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p>No conversations recorded yet.<br>Start chatting with an AI to begin.</p>
          </div>
        `;
        return;
      }

      const sessionsHtml = response.sessions.slice(0, 50).map(session => {
        const provider = getProviderInfo(session.provider);
        const title = generateTitle(session, null) || 'Untitled conversation';
        const time = formatTime(session.startedAt);

        return `
          <div class="session-item" data-session-id="${session.id}">
            <div class="session-icon ${provider.class}">${provider.letter}</div>
            <div class="session-info">
              <div class="session-title">${escapeHtml(title)}</div>
              <div class="session-meta">
                <span>${provider.name}</span>
                <span>·</span>
                <span>${time}</span>
                <span>·</span>
                <span>${session.messageCount || 0} messages</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      elements.sessionsList.innerHTML = sessionsHtml;

      // Add click handlers
      elements.sessionsList.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', () => openSession(item.dataset.sessionId));
      });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      elements.sessionsList.innerHTML = `
        <div class="empty-state">
          <p>Failed to load conversations.</p>
        </div>
      `;
    }
  }

  // Open session detail
  async function openSession(sessionId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SESSION_MESSAGES',
        sessionId
      });

      if (!response.success) return;

      const messages = response.messages.sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      elements.detailTitle.textContent = `${messages.length} messages`;
      elements.detailMeta.textContent = formatTime(messages[0]?.timestamp);

      elements.messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.role}">
          <div class="message-role">${msg.role === 'user' ? 'You' : 'AI'}</div>
          <div class="message-content">${escapeHtml(msg.content)}</div>
        </div>
      `).join('');

      elements.sessionDetail.classList.add('active');
    } catch (error) {
      console.error('Failed to open session:', error);
    }
  }

  // Close session detail
  elements.backBtn.addEventListener('click', () => {
    elements.sessionDetail.classList.remove('active');
  });

  // Search functionality
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      elements.searchResults.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <p>Search across all your AI conversations</p>
        </div>
      `;
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SEARCH',
          query
        });

        if (!response.success || !response.results.length) {
          elements.searchResults.innerHTML = `
            <div class="empty-state">
              <p>No results found for "${escapeHtml(query)}"</p>
            </div>
          `;
          return;
        }

        const resultsHtml = response.results.slice(0, 20).map(msg => {
          const content = highlightMatch(msg.content, query);
          const time = formatTime(msg.timestamp);

          return `
            <div class="search-result" data-session-id="${msg.sessionId}">
              <div class="search-result-meta">
                <span>${msg.role === 'user' ? 'You' : 'AI'}</span>
                <span>·</span>
                <span>${time}</span>
              </div>
              <div class="search-result-content">${content}</div>
            </div>
          `;
        }).join('');

        elements.searchResults.innerHTML = resultsHtml;

        // Switch to search tab
        document.querySelector('[data-tab="search"]').click();

        // Add click handlers
        elements.searchResults.querySelectorAll('.search-result').forEach(item => {
          item.addEventListener('click', () => openSession(item.dataset.sessionId));
        });
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, 300);
  });

  // Export functionality
  elements.exportBtn.addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT' });

      if (!response.success) {
        alert('Export failed');
        return;
      }

      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `llmemo-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  });

  // Utility: escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Utility: highlight search match
  function highlightMatch(text, query) {
    const escaped = escapeHtml(text);
    const maxLength = 200;

    // Find position of query
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const pos = lowerText.indexOf(lowerQuery);

    if (pos === -1) return escaped.slice(0, maxLength) + '...';

    // Extract context around match
    const start = Math.max(0, pos - 50);
    const end = Math.min(text.length, pos + query.length + 100);
    let excerpt = text.slice(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    // Highlight
    const escapedExcerpt = escapeHtml(excerpt);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapedExcerpt.replace(regex, '<mark>$1</mark>');
  }

  // Utility: escape regex special chars
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Initialize
  loadStats();
  loadSessions();
  loadRecordingStatus();
});
