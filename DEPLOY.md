# 🚀 Deployment Guide

## Quick Deploy (2 minutes)

### Option 1: Railway (Recommended)
1. Go to https://railway.app/new
2. Login with GitHub
3. Select repository: `00xLazy/btc-ai-predictor`
4. Click **Deploy**

### Option 2: Render  
1. Go to https://dashboard.render.com
2. Click **New Web Service**
3. Connect GitHub repo `btc-ai-predictor`
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Click **Create Web Service**

### Option 3: Vercel
```bash
npm i -g vercel
cd btc-ai-predictor
vercel --prod
```

## Local Development
```bash
cd btc-ai-predictor
npm install
npm start  # http://localhost:3000
```

## API Endpoints
- `/api/predictions` - All predictions
- `/api/real` - Real market data
- `/api/comparison` - Side-by-side comparison  
- `/api/stats` - Performance statistics

## Environment Variables
None required (reads from local btc-ai-report.md)
