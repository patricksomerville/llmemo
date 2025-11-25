// LLMemo Content Script for ChatGPT
// Captures conversation messages as they appear

(function() {
  'use strict';

  const PROVIDER = 'openai';
  let lastMessageCount = 0;
  let observerActive = false;
  let capturedMessages = new Set();
  let recordingEnabled = true;
  let providerEnabled = true;

  // Check if recording is enabled
  async function checkRecordingStatus() {
    try {
      const settings = await chrome.storage.local.get(['recordingEnabled', 'providerOpenAI']);
      recordingEnabled = settings.recordingEnabled !== false;
      providerEnabled = settings.providerOpenAI !== false;
    } catch (e) {
      recordingEnabled = true;
      providerEnabled = true;
    }
  }

  // Listen for settings changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_CHANGED') {
      if ('recordingEnabled' in message.settings) {
        recordingEnabled = message.settings.recordingEnabled;
      }
      if ('providerOpenAI' in message.settings) {
        providerEnabled = message.settings.providerOpenAI;
      }
    }
  });

  checkRecordingStatus();

  // Extract conversation ID from URL
  function getConversationId() {
    const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  // Detect message role from element
  function getMessageRole(element) {
    // ChatGPT uses data-message-author-role attribute
    const role = element.getAttribute('data-message-author-role');
    if (role) {
      return role === 'user' ? 'user' : 'assistant';
    }

    // Fallback: check for user avatar or styling patterns
    if (element.querySelector('[data-testid="user-avatar"]') ||
        element.classList.contains('user-message')) {
      return 'user';
    }

    return 'assistant';
  }

  // Extract clean text content from message
  function extractContent(element) {
    // Find the actual message content container
    const contentDiv = element.querySelector('.markdown') ||
                       element.querySelector('[class*="message-content"]') ||
                       element;

    // Clone to avoid modifying the page
    const clone = contentDiv.cloneNode(true);

    // Remove buttons, copy icons, etc
    clone.querySelectorAll('button, [role="button"], svg, .copy-code-button').forEach(el => el.remove());

    // Handle code blocks specially
    const codeBlocks = clone.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      const code = pre.querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
      const text = code?.textContent || pre.textContent;
      pre.textContent = `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
    });

    return clone.textContent?.trim() || '';
  }

  // Generate hash for deduplication
  function hashMessage(role, content) {
    const str = `${role}:${content.substring(0, 200)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  // Capture a single message
  function captureMessage(element) {
    if (!recordingEnabled || !providerEnabled) return;

    const content = extractContent(element);
    if (!content || content.length < 2) return;

    const role = getMessageRole(element);
    const hash = hashMessage(role, content);

    if (capturedMessages.has(hash)) return;
    capturedMessages.add(hash);

    const conversationId = getConversationId();

    chrome.runtime.sendMessage({
      type: 'NEW_MESSAGE',
      payload: {
        provider: PROVIDER,
        conversationId,
        url: window.location.href,
        role,
        content,
        metadata: {
          capturedAt: new Date().toISOString(),
          pageTitle: document.title,
          model: detectModel()
        }
      }
    }).catch(() => {
      // Extension context may be invalid, ignore
    });

    console.log(`[LLMemo] Captured ${role} message (${content.length} chars)`);
  }

  // Try to detect which model is being used
  function detectModel() {
    // Look for model selector or indicators
    const modelIndicator = document.querySelector('[data-testid="model-selector"]') ||
                          document.querySelector('[class*="model"]');
    if (modelIndicator) {
      const text = modelIndicator.textContent || '';
      if (text.includes('4')) return 'gpt-4';
      if (text.includes('3.5')) return 'gpt-3.5-turbo';
    }
    return 'unknown';
  }

  // Find all message containers on the page
  function findMessageContainers() {
    // ChatGPT message selectors
    const selectors = [
      '[data-message-author-role]',
      '[data-testid="conversation-turn"]',
      'div[class*="ConversationItem"]',
      '.group\\/conversation-turn'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return Array.from(elements);
      }
    }

    return [];
  }

  // Scan page for messages
  function scanForMessages() {
    const containers = findMessageContainers();

    if (containers.length !== lastMessageCount) {
      containers.forEach(captureMessage);
      lastMessageCount = containers.length;
    }
  }

  // Set up mutation observer
  function setupObserver() {
    if (observerActive) return;

    const target = document.querySelector('main') || document.body;

    const observer = new MutationObserver((mutations) => {
      // Debounce rapid changes
      clearTimeout(window.llmemoScanTimeout);
      window.llmemoScanTimeout = setTimeout(scanForMessages, 500);
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });

    observerActive = true;
    console.log('[LLMemo] Observer active on ChatGPT');
  }

  // Initialize
  function init() {
    // Initial scan
    setTimeout(scanForMessages, 1000);

    // Set up observer
    setupObserver();

    // Periodic scan as backup
    setInterval(scanForMessages, 5000);
  }

  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
