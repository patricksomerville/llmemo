// LLMemo Content Script for Google Gemini
// Captures conversation messages as they appear

(function() {
  'use strict';

  const PROVIDER = 'google';
  let lastMessageCount = 0;
  let observerActive = false;
  let capturedMessages = new Set();
  let recordingEnabled = true;
  let providerEnabled = true;

  // Check if recording is enabled
  async function checkRecordingStatus() {
    try {
      const settings = await chrome.storage.local.get(['recordingEnabled', 'providerGoogle']);
      recordingEnabled = settings.recordingEnabled !== false;
      providerEnabled = settings.providerGoogle !== false;
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
      if ('providerGoogle' in message.settings) {
        providerEnabled = message.settings.providerGoogle;
      }
    }
  });

  checkRecordingStatus();

  // Extract conversation ID from URL
  function getConversationId() {
    const match = window.location.pathname.match(/\/app\/([a-f0-9-]+)/);
    return match ? match[1] : window.location.href;
  }

  // Detect message role from element
  function getMessageRole(element) {
    // Gemini uses specific class patterns
    const classes = element.className || '';

    if (classes.includes('user') ||
        element.querySelector('[class*="user"]') ||
        element.getAttribute('data-author') === 'user') {
      return 'user';
    }

    if (classes.includes('model') ||
        element.querySelector('[class*="model"]') ||
        element.getAttribute('data-author') === 'model') {
      return 'assistant';
    }

    // Check parent elements
    const parent = element.closest('[class*="query"]') || element.closest('[class*="response"]');
    if (parent) {
      if (parent.className.includes('query')) return 'user';
      if (parent.className.includes('response')) return 'assistant';
    }

    return 'assistant';
  }

  // Extract clean text content from message
  function extractContent(element) {
    const clone = element.cloneNode(true);

    // Remove UI elements
    clone.querySelectorAll('button, [role="button"], svg, mat-icon').forEach(el => el.remove());

    // Handle code blocks
    const codeBlocks = clone.querySelectorAll('pre, code-block');
    codeBlocks.forEach(pre => {
      const code = pre.querySelector('code') || pre;
      const text = code.textContent;
      pre.textContent = `\n\`\`\`\n${text}\n\`\`\`\n`;
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
          pageTitle: document.title
        }
      }
    }).catch(() => {});

    console.log(`[LLMemo] Captured ${role} message (${content.length} chars)`);
  }

  // Find all message containers
  function findMessageContainers() {
    const selectors = [
      'message-content',
      '[class*="conversation-turn"]',
      '[class*="query-content"]',
      '[class*="response-content"]',
      '[class*="message-wrapper"]'
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

    const observer = new MutationObserver(() => {
      clearTimeout(window.llmemoScanTimeout);
      window.llmemoScanTimeout = setTimeout(scanForMessages, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    observerActive = true;
    console.log('[LLMemo] Observer active on Gemini');
  }

  // Initialize
  function init() {
    setTimeout(scanForMessages, 1000);
    setupObserver();
    setInterval(scanForMessages, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
