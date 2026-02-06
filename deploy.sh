#!/bin/bash
# BTC AI Predictor Deployment Script

echo "🚀 Deploying BTC AI Predictor..."

# Check for Railway
if command -v railway &> /dev/null; then
    echo "Using Railway..."
    railway up
elif command -v flyctl &> /dev/null; then
    echo "Using Fly.io..."
    flyctl launch --name btc-ai-predictor
else
    echo "No CLI found. Deploy options:"
    echo ""
    echo "1️⃣ RAILWAY (Recommended):"
    echo "   - Go to https://railway.app/new"
    echo "   - Login with GitHub"
    echo "   - Select 'btc-ai-predictor' repository"
    echo "   - Done!"
    echo ""
    echo "2️⃣ RENDER:"
    echo "   - Go to https://dashboard.render.com"
    echo "   - New Web Service"
    echo "   - Connect GitHub repo 'btc-ai-predictor'"
    echo "   - Build: npm install"
    echo "   - Start: node server.js"
    echo ""
    echo "3️⃣ LOCAL:"
    echo "   - npm install && npm start"
    echo ""
fi
