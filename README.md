# MC Portfolio Dashboard

Premium React portfolio dashboard powered by Google Sheets + Finnhub + gold-api.com.

## Stack
- React 18 + Vite
- Tailwind CSS
- Recharts
- Apps Script (data API)

## Setup

### 1. Update Apps Script

Replace the `doGet` function in your Apps Script `Code.gs` with the contents of `CODE_GS_UPDATE.gs`. This adds URL parameter routing so the React app can call specific functions.

Redeploy as a new version.

### 2. Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to vercel.com → New Project → Import from GitHub
3. Select the repo
4. Framework: **Vite**
5. Build command: `npm run build`
6. Output directory: `dist`
7. Click Deploy

That's it. Vercel auto-deploys on every push.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000
