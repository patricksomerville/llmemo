# LLMemo

Every AI conversation is a meeting worth remembering.

LLMemo is a Chrome extension that automatically records your conversations with Claude, ChatGPT, and Gemini. Search, revisit, and export your AI chat history.

![LLMemo Screenshot](assets/screenshot.png)

## Why?

Your AI conversations contain:
- Architectural decisions and their rationale
- Debugging sessions that took hours to solve
- Creative breakthroughs you'll forget you had
- Code that works (and explanations of why)
- Research and synthesis across dozens of topics

Yet they disappear into siloed chat histories, unsearchable and forgotten.

LLMemo treats every AI conversation like a meeting worth preserving.

## Features

- **Automatic Recording** - Captures conversations in the background as you chat
- **Full-Text Search** - Find that conversation from three weeks ago instantly
- **100% Local** - All data stored on your device, never sent to external servers
- **Export Anytime** - Download all your data in JSON format
- **Multi-Provider** - Works with Claude, ChatGPT, and Gemini

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store listing](https://chrome.google.com/webstore/detail/llmemo/YOUR_ID)
2. Click "Add to Chrome"
3. Start chatting with any supported AI

### From Source

```bash
# Clone the repo
git clone https://github.com/patricksomerville/llmemo.git
cd llmemo

# Load in Chrome
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder
```

## Usage

Once installed, LLMemo works automatically:

1. **Recording**: Visit claude.ai, chatgpt.com, or gemini.google.com and chat normally. Messages are captured automatically.

2. **Viewing**: Click the LLMemo icon in your browser toolbar to see recorded sessions.

3. **Searching**: Use the search bar to find specific conversations or topics.

4. **Exporting**: Go to the Export tab to download all your data as JSON.

## Privacy

LLMemo is designed with privacy as a core principle:

- **Local Storage Only**: All data is stored in your browser's IndexedDB. Nothing leaves your device.
- **No Accounts**: No sign-up required. No tracking. No analytics.
- **No Network Requests**: The extension makes zero external network requests (except to the AI sites you're already using).
- **Open Source**: Full source code available for inspection.

## Supported Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Claude (claude.ai) | ✅ Supported | Full conversation capture |
| ChatGPT (chatgpt.com) | ✅ Supported | Full conversation capture |
| Gemini (gemini.google.com) | ✅ Supported | Full conversation capture |
| Perplexity | 🔜 Coming | Planned |
| Poe | 🔜 Coming | Planned |

## Development

```bash
# Clone
git clone https://github.com/patricksomerville/llmemo.git
cd llmemo

# Make changes to extension/

# Test locally
# Load unpacked extension in Chrome, make changes, reload

# Build for production
cd extension && zip -r ../llmemo.zip .
```

### Project Structure

```
llmemo/
├── extension/
│   ├── manifest.json        # Chrome extension manifest (MV3)
│   ├── background.js        # Service worker, IndexedDB, message handling
│   ├── content-scripts/
│   │   ├── claude.js        # Claude.ai content script
│   │   ├── chatgpt.js       # ChatGPT content script
│   │   └── gemini.js        # Gemini content script
│   ├── popup/
│   │   ├── popup.html       # Extension popup UI
│   │   ├── popup.css        # Styles
│   │   └── popup.js         # Popup logic
│   └── icons/
│       └── *.png            # Extension icons
├── landing-page/
│   └── index.html           # Marketing site
├── PUBLISH.md               # Publishing checklist
└── README.md                # This file
```

### Adding a New Provider

1. Create `extension/content-scripts/newprovider.js`
2. Implement message detection using MutationObserver
3. Send messages to background script via `chrome.runtime.sendMessage`
4. Add to `manifest.json` content_scripts array
5. Test thoroughly - DOM structures vary and change frequently

## Pricing

- **Free**: 50 recorded sessions, full search, full export
- **Pro** ($10/month or $79 lifetime): Unlimited sessions, priority support

## Roadmap

- [ ] AI-generated session summaries
- [ ] Semantic search (find by meaning, not just keywords)
- [ ] Desktop app for Claude Desktop, Cursor, etc.
- [ ] Cross-device sync (encrypted, optional)
- [ ] Perplexity and Poe support
- [ ] Firefox extension

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

For major changes, open an issue first to discuss.

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- Inspired by the insight that AI conversations are meetings
- Built with vanilla JS for minimal footprint
- UI design influenced by modern dark themes

---

**Every conversation with an AI is a meeting. Start treating it like one.**
