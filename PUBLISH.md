# How to Publish LLMemo

**Total time: 30-45 minutes**

You have a working product. Here's exactly how to get it live and accepting payments.

---

## Step 1: Create Lemonsqueezy Account (5 min)

1. Go to https://lemonsqueezy.com
2. Click "Get Started Free"
3. Sign up with Google or email
4. Complete the onboarding (business name: "LLMemo" or your name)
5. Connect Stripe for payments (they walk you through it)

### Create Your Products

**Monthly Product:**
1. Dashboard → Products → Create Product
2. Name: "LLMemo Pro Monthly"
3. Price: $10/month (recurring)
4. Description: "Unlimited AI conversation recording"
5. Save → Copy the checkout URL

**Lifetime Product:**
1. Create another product
2. Name: "LLMemo Pro Lifetime"
3. Price: $79 (one-time)
4. Save → Copy the checkout URL

### Update Landing Page

Open `landing-page/index.html` and find these lines near the bottom:

```javascript
const LEMONSQUEEZY_MONTHLY_URL = 'https://YOURSTORE.lemonsqueezy.com/checkout/buy/PRODUCT_ID';
const LEMONSQUEEZY_LIFETIME_URL = 'https://YOURSTORE.lemonsqueezy.com/checkout/buy/LIFETIME_PRODUCT_ID';
```

Replace with your actual URLs from Lemonsqueezy.

---

## Step 2: Publish Chrome Extension (15 min)

### Create Developer Account (one-time)

1. Go to https://chrome.google.com/webstore/devconsole
2. Pay $5 one-time registration fee
3. Fill out developer info

### Prepare Extension

```bash
cd /Users/patricksomerville/Projects/llm-meeting-recorder/extension
zip -r ../llmemo-extension.zip .
```

### Upload to Chrome Web Store

1. In Developer Console, click "New Item"
2. Upload `llmemo-extension.zip`
3. Fill out listing:
   - **Name:** LLMemo - Record Your AI Conversations
   - **Summary:** Every AI conversation is a meeting worth remembering. Record, search, and revisit your chats with Claude, ChatGPT, and more.
   - **Description:** (paste from below)
   - **Category:** Productivity
   - **Language:** English
4. Upload screenshots (see below for how to create them)
5. Submit for review (usually 1-3 business days)

### Store Description (copy this)

```
Every AI conversation is a meeting worth remembering.

LLMemo automatically records your conversations with Claude, ChatGPT, and Gemini so you never lose valuable context, decisions, or ideas.

FEATURES:
• Automatic Recording - Captures conversations in the background
• Full-Text Search - Find that chat from weeks ago instantly
• 100% Local - All data stays on your device, never sent to servers
• Export Anytime - Download your data in JSON format
• Works Everywhere - Claude, ChatGPT, Gemini supported

WHY LLMEMO?
Your AI conversations contain architectural decisions, debugging sessions, creative breakthroughs, and ideas you'll forget you had. Stop letting them disappear into chat history.

PRIVACY:
- All data stored locally on your device
- No cloud sync, no accounts required for basic use
- Open source: [GitHub link]

Free tier includes 50 recorded sessions. Upgrade to Pro for unlimited.
```

### Screenshots

Create 3-5 screenshots showing:
1. The popup with session list
2. Search results
3. A conversation detail view
4. Recording indicator

**Quick way:** Install the extension locally (chrome://extensions → Load unpacked → select `extension` folder), use it, then screenshot.

---

## Step 3: Deploy Landing Page (5 min)

### Option A: Vercel (Recommended)

1. Go to https://vercel.com
2. Sign up/in with GitHub
3. Click "Add New Project"
4. Import from GitHub (push this repo first) OR:

**Without GitHub:**
```bash
cd /Users/patricksomerville/Projects/llm-meeting-recorder/landing-page
npx vercel
```

5. Follow prompts, accept defaults
6. Get your URL (something.vercel.app)
7. Later: Add custom domain if you want

### Option B: Netlify

1. Go to https://netlify.com
2. Drag the `landing-page` folder onto the deploy zone
3. Get your URL

### Update Extension Store Listing

Once you have the landing page URL, add it to your Chrome Web Store listing as the "homepage URL".

---

## Step 4: Post Somewhere (5 min)

Pick one:

### Hacker News
```
Show HN: LLMemo – Record your AI conversations like meetings

I built a Chrome extension that captures your chats with Claude, ChatGPT, and Gemini automatically. Every conversation gets recorded locally so you can search and revisit them later.

Free for 50 sessions, $10/mo for unlimited.

https://your-landing-page.vercel.app

Why? I realized my AI conversations contain more decisions and useful context than most human meetings, but they just disappear into chat history.
```

### Reddit r/ChatGPT or r/ClaudeAI
Similar post, adjust tone for Reddit.

### Twitter/X
```
shipped something:

LLMemo records your AI conversations automatically - Claude, ChatGPT, Gemini.

because your chats contain decisions, debugging sessions, and ideas worth keeping.

100% local, free tier, $10/mo for unlimited.

[link]
```

---

## Step 5: License Key Delivery (Optional Enhancement)

Lemonsqueezy can auto-generate license keys. To make the extension check for them:

1. In Lemonsqueezy: Product → License Keys → Enable
2. Add a simple license check to the extension (I can add this later)

For now, the "Pro" features can just be trust-based or you can manually track who paid.

---

## File Locations

```
/Users/patricksomerville/Projects/llm-meeting-recorder/
├── CONCEPT.md              # Product vision doc
├── PUBLISH.md              # This file
├── extension/              # Chrome extension (ready to zip)
│   ├── manifest.json
│   ├── background.js
│   ├── content-scripts/
│   │   ├── claude.js
│   │   ├── chatgpt.js
│   │   └── gemini.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── landing-page/
    └── index.html          # Single-file landing page
```

---

## After Launch

Once you have paying customers:

1. **Improve capture reliability** - Claude and ChatGPT change their DOM regularly
2. **Add license validation** - Gate Pro features properly
3. **Build desktop app** - Capture Claude Desktop, Cursor, etc.
4. **Add AI summaries** - Auto-generate meeting notes for each session

---

## Quick Reference

| Thing | Where |
|-------|-------|
| Extension folder | `/Users/patricksomerville/Projects/llm-meeting-recorder/extension` |
| Landing page | `/Users/patricksomerville/Projects/llm-meeting-recorder/landing-page/index.html` |
| Chrome Dev Console | https://chrome.google.com/webstore/devconsole |
| Lemonsqueezy | https://app.lemonsqueezy.com |
| Vercel | https://vercel.com |

---

**The product is built. The only thing between you and revenue is clicking some buttons.**

Good luck with your mom. The script will get done. This will be here when you have 30 minutes.
