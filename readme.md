Gemini/OpenAI Bidder Pro (MV3)
==============================

Generate concise, human-sounding proposals for Freelancer.com using Google Gemini or OpenAI. Extract page defaults (bid amount, delivery time), preview and insert your bid, and optionally generate clarifying questions — all from a modern, accessible popup UI.

Table of Contents
- Features
- Architecture
- Project Structure
- Requirements
- Setup (Build & Install)
- Configuration (Providers, Keys, Models)
- Usage
- Keyboard Shortcuts
- Permissions & Privacy
- Troubleshooting
- Customization
- Roadmap
- Contributing
- License

Features
- Gemini/OpenAI switch: choose provider directly in the popup or options
- Model selection in options (e.g., gemini-1.5-flash-latest, gpt-4o-mini)
- Extracts project details: description, budget, default bid amount, delivery time
- One‑click proposal generation (3–6 lines, human tone, non‑AI style)
- Insert proposal, amount, and time directly into the page form
- Generate clarifying questions (3–5 concise lines)
- Modern light theme, wider layout, accessible focus states and status messages

Architecture
- Manifest V3 Chrome extension
  - Background (service worker): calls Gemini/OpenAI, routes based on provider
  - Content script: scrapes page details, fills form fields
  - Popup (React + Vite + TypeScript): primary UI and user flows
  - Options (React): provider, API key, model configuration (stored in chrome.storage.sync)

Project Structure
```
gemini-bidder-extension/
├─ background.js          # Service worker (API calls, routing, messaging)
├─ content.js             # Page scraper + form filler (injected on project pages)
├─ manifest.json          # MV3 manifest
├─ images/                # Extension icons
├─ src/
│  ├─ popup/
│  │  ├─ index.html      # Popup entry HTML (built by Vite)
│  │  ├─ main.tsx        # Bootstraps React popup
│  │  └─ popup.tsx       # Popup UI/logic
│  └─ options/
│     ├─ index.html      # Options entry HTML
│     ├─ main.tsx        # Bootstraps React options
│     └─ options.tsx     # Options UI/logic (provider, keys, models)
├─ popup.css              # Shared popup styling (imported by React)
├─ package.json           # Scripts + deps (React, Vite, TS)
├─ vite.config.ts         # Multi-page build (popup + options)
└─ tsconfig.json
```

Requirements
- Node.js 18+
- Chrome/Chromium (MV3 support)

Setup (Build & Install)
1) Install dependencies and build
```bash
npm install
npm run build
```
This produces a complete extension bundle in `dist/` with:
- `dist/src/popup/index.html` (popup)
- `dist/src/options/index.html` (options)
- `dist/background.js`, `dist/content.js`, `dist/manifest.json`, `dist/images/*`

2) Load the extension in Chrome
- Go to `chrome://extensions`
- Enable Developer mode (top-right)
- Click “Load unpacked” and select the `dist` folder

Configuration (Providers, Keys, Models)
- Options page (right-click the extension → Options or click “Configure API Key” in the popup):
  - AI Provider: Google Gemini or OpenAI
  - API Key: paste your key for the chosen provider
  - Model:
    - Gemini: e.g., `gemini-1.5-flash-latest`, `gemini-1.5-pro-latest`
    - OpenAI: e.g., `gpt-4o-mini`, `gpt-4o`
- Keys and settings are stored in Chrome sync storage (local to your browser account)

Usage
1) Open any Freelancer project page (URL contains `freelancer.com/projects/`)
2) Open the extension popup
3) Choose your provider (Gemini/OpenAI) — you can also set a default in Options
4) Click “Generate Bid Preview”
   - The extension extracts: description, budget, default bid amount, delivery time
   - It calls your selected provider/model to generate a short, human-like proposal
   - The preview is shown with fields prefilled; adjust if needed
5) Click “Insert Bid into Page” to populate the form on Freelancer
6) Optional: Click “Generate Questions” to produce 3–5 concise clarifying questions

Keyboard Shortcuts
- Cmd/Ctrl + G: Generate bid preview
- Cmd/Ctrl + C: Copy proposal
- Enter: Insert bid (when preview is visible)

Permissions & Privacy
- `storage`: save API keys and settings in chrome.storage.sync
- `activeTab`, `host_permissions` for `freelancer.com`: read project details and fill the bid form
- `https://generativelanguage.googleapis.com/*` (Gemini) and `https://api.openai.com/*` (OpenAI): call model APIs
- API keys are used only to call the provider you select. They are not transmitted elsewhere.

Troubleshooting
- Popup says “Not on a Freelancer project page”
  - Ensure the active tab is a project page (URL contains `freelancer.com/projects/`)
- “Connection failed. Please REFRESH the Freelancer tab and try again.”
  - The content script needs to be injected/active; refresh the tab and try again
- “API key missing”
  - Open Options and add a key for the current provider. You can also switch provider in the popup.
- Provider errors like 503/overloaded
  - Temporary; wait a few seconds and try again
- Bid amount or delivery time empty
  - The extension tries multiple selectors; if a page variant changes, share the DOM snippet and update selectors in `content.js`

Customization
- Change models at runtime via Options → Model
- Adjust the generation prompt (tone and rules): see `buildPrompt()` in `background.js`
- Tweak UI (colors/layout): edit `popup.css`
- Add new providers: extend settings, add a `generateBidWithX()` in `background.js`, update options/popup

Roadmap
- Two-column responsive layout (Bid on left, Questions + Project details on right)
- Provider/model quick toggle in popup header
- Optional tone/length selectors
- Export/copy to templates

Contributing
Pull requests are welcome. Please open an issue to discuss major changes beforehand.

License
MIT
