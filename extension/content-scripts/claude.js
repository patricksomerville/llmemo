// LLMemo Content Script for Claude.ai
// Captures conversation messages as they appear

(function() {
  'use strict';

  const PROVIDER = 'claude';
  let lastMessageCount = 0;
  let observerActive = false;
  let capturedMessages = new Set();
  let recordingEnabled = true;
  let providerEnabled = true;

  // Check if recording is enabled
  async function checkRecordingStatus() {
    try {
      const settings = await chrome.storage.local.get(['recordingEnabled', 'providerClaude']);
      recordingEnabled = settings.recordingEnabled !== false;
      providerEnabled = settings.providerClaude !== false;
    } catch (e) {
      // Default to enabled if storage access fails
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
      if ('providerClaude' in message.settings) {
        providerEnabled = message.settings.providerClaude;
      }
    }
  });

  // Initial settings check
  checkRecordingStatus();

  // Extract conversation ID from URL
  function getConversationId() {
    const match = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  // Detect message role from element
  function getMessageRole(element) {
    // Claude uses data attributes and class patterns
    const text = element.textContent || '';
    const classes = element.className || '';

    // Human messages typically have different styling
    if (element.querySelector('[data-testid="human-message"]') ||
        classes.includes('human') ||
        element.closest('[data-is-human="true"]')) {
      return 'user';
    }

    return 'assistant';
  }

  // Extract clean text content from message
  function extractContent(element) {
    // Clone to avoid modifying the page
    const clone = element.cloneNode(true);

    // Remove buttons, controls, etc
    clone.querySelectorAll('button, [role="button"], .copy-button').forEach(el => el.remove());

    // Get text content, preserving code blocks
    let content = '';
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        content += node.textContent;
      } else if (node.tagName === 'PRE' || node.tagName === 'CODE') {
        content += '\n```\n' + node.textContent + '\n```\n';
      } else if (node.tagName === 'BR') {
        content += '\n';
      }
    }

    return content.trim();
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
    // Check if recording is enabled
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
    }).catch(() => {
      // Extension context may be invalid, ignore
    });

    console.log(`[LLMemo] Captured ${role} message (${content.length} chars)`);
  }

  // Find all message containers on the page
  function findMessageContainers() {
    // Claude's message selectors (these may need updating as Claude changes)
    const selectors = [
      '[data-testid="conversation-turn"]',
      '.prose',
      '[class*="Message"]',
      '[class*="message-content"]',
      'div[class*="ConversationMessage"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return Array.from(elements);
      }
    }

    // Fallback: look for the main conversation container
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      // Find direct children that look like messages
      return Array.from(mainContent.querySelectorAll('div')).filter(el => {
        const text = el.textContent || '';
        return text.length > 50 && text.length < 50000;
      });
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
    console.log('[LLMemo] Observer active on Claude.ai');
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
