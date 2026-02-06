# BTC AI Predictor

🤖 AI-driven Bitcoin price prediction system that generates 4-hour forecast candles and compares them with real market data.

## Features

- 📊 Generates 4-hour forecast candles based on AI signals
- 📈 Visual comparison with real Binance price data
- 📉 Historical prediction performance tracking
- ⏰ Automatic prediction every 4 hours

## Quick Start

```bash
# Install dependencies
npm install

# Start web server
npm start

# Run prediction manually
npm run predict

# Start scheduler (runs prediction every 4 hours)
npm run scheduler
```

## Architecture

```
btc-ai-predictor/
├── server.js          # Web server & API
├── predict.js         # AI prediction engine
├── scheduler.js       # 4-hour scheduling
├── public/
│   └── index.html    # Dashboard UI
├── data/
│   ├── predictions.json   # AI predictions
│   └── real-candles.json # Real market data
└── package.json
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictions` | GET | All predictions |
| `/api/real` | GET | Real market candles |
| `/api/comparison` | GET | Side-by-side comparison |
| `/api/stats` | GET | Performance statistics |
| `/api/predict` | POST | Trigger new prediction |

## How It Works

1. Fetches latest 4h candles from Binance
2. Reads AI signal from `btc-ai-report.md`
3. Generates 4-hour forecast candle
4. Compares with real data when candle completes
5. Tracks accuracy over time

## License

MIT
