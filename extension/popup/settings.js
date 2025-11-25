// LLMemo Settings Script

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    backBtn: document.getElementById('backBtn'),
    recordingEnabled: document.getElementById('recordingEnabled'),
    providerClaude: document.getElementById('providerClaude'),
    providerOpenAI: document.getElementById('providerOpenAI'),
    providerGoogle: document.getElementById('providerGoogle'),
    totalSessions: document.getElementById('totalSessions'),
    totalMessages: document.getElementById('totalMessages'),
    storageSize: document.getElementById('storageSize'),
    clearDataBtn: document.getElementById('clearDataBtn')
  };

  // Load settings
  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      'recordingEnabled',
      'providerClaude',
      'providerOpenAI',
      'providerGoogle'
    ]);

    // Default to enabled
    elements.recordingEnabled.checked = settings.recordingEnabled !== false;
    elements.providerClaude.checked = settings.providerClaude !== false;
    elements.providerOpenAI.checked = settings.providerOpenAI !== false;
    elements.providerGoogle.checked = settings.providerGoogle !== false;
  }

  // Save settings
  async function saveSetting(key, value) {
    await chrome.storage.local.set({ [key]: value });

    // Notify content scripts of settings change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (
          tab.url.includes('claude.ai') ||
          tab.url.includes('chatgpt.com') ||
          tab.url.includes('chat.openai.com') ||
          tab.url.includes('gemini.google.com')
        )) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_CHANGED',
            settings: { [key]: value }
          }).catch(() => {});
        }
      });
    });
  }

  // Load stats
  async function loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response.success) {
        elements.totalSessions.textContent = response.stats.totalSessions || 0;
        elements.totalMessages.textContent = response.stats.totalMessages || 0;

        // Estimate storage size
        const estimate = await navigator.storage?.estimate?.();
        if (estimate) {
          const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
          elements.storageSize.textContent = `${usedMB}MB`;
        } else {
          elements.storageSize.textContent = '--';
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Event listeners
  elements.backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  elements.recordingEnabled.addEventListener('change', (e) => {
    saveSetting('recordingEnabled', e.target.checked);
  });

  elements.providerClaude.addEventListener('change', (e) => {
    saveSetting('providerClaude', e.target.checked);
  });

  elements.providerOpenAI.addEventListener('change', (e) => {
    saveSetting('providerOpenAI', e.target.checked);
  });

  elements.providerGoogle.addEventListener('change', (e) => {
    saveSetting('providerGoogle', e.target.checked);
  });

  elements.clearDataBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you sure you want to delete all recorded conversations?\n\n' +
      'This action cannot be undone.'
    );

    if (confirmed) {
      try {
        // Clear IndexedDB
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name === 'llmemo') {
            indexedDB.deleteDatabase(db.name);
          }
        }

        // Clear storage
        await chrome.storage.local.clear();

        // Reset settings to defaults
        await chrome.storage.local.set({
          recordingEnabled: true,
          providerClaude: true,
          providerOpenAI: true,
          providerGoogle: true
        });

        alert('All data has been cleared.');
        loadStats();
        loadSettings();
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  });

  // Initialize
  loadSettings();
  loadStats();
});
