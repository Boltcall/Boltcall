# Boltcall Codespace

Cloud dev environment for boltcall.org + SaaS. Runs in your browser, works from phone.

## First-time setup (do once)

### 1. Paste secrets into GitHub

Go to **https://github.com/settings/codespaces** → **Codespaces secrets** (user-level, shared across all your repos). Add these, each scoped to this repo:

Required to boot:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLARITY_PROJECT_ID`

Retell (voice agent):
- `RETELL_API_KEY`
- `VITE_RETELL_PUBLIC_KEY`
- `CHALLENGE_AGENT_ID`
- `CHALLENGE_SECRET_WORD`
- `CHALLENGE_SECRET_CLUE`
- `CHALLENGE_SESSION_SECRET`
- `CHALLENGE_CLAIM_SECRET`

PayPal (live):
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE` = `live`
- `PAYPAL_PLAN_STARTER_MONTHLY`, `PAYPAL_PLAN_STARTER_YEARLY`
- `PAYPAL_PLAN_PRO_MONTHLY`, `PAYPAL_PLAN_PRO_YEARLY`
- `PAYPAL_PLAN_ULTIMATE_MONTHLY`, `PAYPAL_PLAN_ULTIMATE_YEARLY`
- `PAYPAL_PRODUCT_ID`
- `VITE_PAYPAL_CLIENT_ID`

Notifications:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Analytics:
- `VITE_GA_MEASUREMENT_ID`

Deploy:
- `NETLIFY_AUTH_TOKEN`

Source of truth = 1Password. When you rotate a key: update 1Password → update this GitHub secret. That's it.

### 2. Create your first Codespace

- Push `codespaces-setup` branch to GitHub
- Go to repo on github.com
- Green **Code** button → **Codespaces** tab → **Create codespace on codespaces-setup**
- Wait ~2 min for build

### 3. Verify it works

Inside Codespace terminal:
```
npm run dev
```
Ports panel → click globe on **5173** → live URL opens. Paste that URL on your phone browser → same site.

## Daily workflow

- Open **github.com/codespaces** on any device
- Click your codespace → resumes state
- Terminal → `npm run dev`
- Edit code → auto-refresh in browser tab
- Commit + push → Netlify deploys

## Phone tips

- Add github.com/codespaces to home screen
- Use iOS dictation for typing
- Slack/Telegram apps for agent notifications
- GitHub mobile app for PR review
