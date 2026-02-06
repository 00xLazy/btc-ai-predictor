/**
 * BTC AI Predictor - AI Prediction Engine
 * Generates 4-hour forecast candles based on technical analysis
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_DIR = './data';
const PREDICTIONS_FILE = './data/predictions.json';
const REAL_DATA_FILE = './data/real-candles.json';
const REPORT_FILE = '../workspace/btc-ai-report.md';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Binance API - Get real kline data
async function getBinanceKlines(interval = '4h', limit = 100) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines`,
      { params: { symbol: 'BTCUSDT', interval, limit } }
    );
    
    return response.data.map(k => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (error) {
    console.error('Error fetching Binance data:', error.message);
    return null;
  }
}

// Save real candles
async function fetchAndSaveRealData() {
  console.log('📊 Fetching real 4h candles from Binance...');
  const candles = await getBinanceKlines('4h', 100);
  
  if (candles) {
    fs.writeFileSync(REAL_DATA_FILE, JSON.stringify(candles, null, 2));
    console.log(`✅ Saved ${candles.length} real candles`);
    return candles;
  }
  return null;
}

// Get AI signal from report
function getAISignal() {
  let signal = { name: '观望', confidence: 0.45 };
  
  try {
    if (fs.existsSync(REPORT_FILE)) {
      const report = fs.readFileSync(REPORT_FILE, 'utf8');
      
      const signalMatch = report.match(/短期信号\[(.+?)\]/);
      if (signalMatch) signal.name = signalMatch[1];
      
      const confMatch = report.match(/置信: (\d+)%/);
      if (confMatch) signal.confidence = parseInt(confMatch[1]) / 100;
    }
  } catch (e) {
    console.log('⚠️ Using default AI signal');
  }
  
  return signal;
}

// Generate prediction candle
function generatePrediction(lastCandle, aiSignal) {
  const { open, high, low, close } = lastCandle;
  const { name, confidence } = aiSignal;
  
  // Determine predicted change based on signal
  let predictedChange = 0;
  let volatility = (high - low) / close * 100;
  
  switch (name) {
    case '买入': predictedChange = confidence * 0.025; break;
    case '谨慎买入': predictedChange = confidence * 0.018; break;
    case '卖出': predictedChange = -confidence * 0.025; break;
    case '谨慎卖出': predictedChange = -confidence * 0.018; break;
    default:
      predictedChange = (Math.random() - 0.5) * 0.008;
      volatility *= 0.7;
  }
  
  // Calculate predicted candle
  const predictedClose = close * (1 + predictedChange);
  const range = close * (volatility / 100);
  
  let predictedHigh, predictedLow;
  if (predictedChange > 0) {
    predictedHigh = Math.max(open, close) + range * (0.5 + Math.random() * 0.3);
    predictedLow = Math.min(open, close) - range * (0.2 + Math.random() * 0.2);
  } else {
    predictedHigh = Math.max(open, close) + range * (0.2 + Math.random() * 0.2);
    predictedLow = Math.min(open, close) - range * (0.5 + Math.random() * 0.3);
  }
  
  return {
    time: lastCandle.time + (4 * 60 * 60 * 1000),
    predicted: true,
    signal: name,
    confidence: confidence,
    open: Math.round(close * 100) / 100,
    high: Math.round(predictedHigh * 100) / 100,
    low: Math.round(predictedLow * 100) / 100,
    close: Math.round(predictedClose * 100) / 100,
    predictedChange: (predictedChange * 100).toFixed(2) + '%',
    generatedAt: new Date().toISOString()
  };
}

// Main prediction function
async function runPrediction() {
  console.log('🤖 AI Prediction Engine Starting...');
  console.log('='.repeat(50));
  
  const realCandles = await fetchAndSaveRealData();
  if (!realCandles || realCandles.length === 0) {
    console.error('❌ No real data available');
    return null;
  }
  
  const lastCandle = realCandles[realCandles.length - 1];
  const aiSignal = getAISignal();
  
  console.log(`📊 Last candle: $${lastCandle.close.toLocaleString()}`);
  console.log(`🤖 AI Signal: ${aiSignal.name} (${(aiSignal.confidence * 100).toFixed(0)}%)`);
  
  const prediction = generatePrediction(lastCandle, aiSignal);
  
  // Save prediction
  let predictions = [];
  if (fs.existsSync(PREDICTIONS_FILE)) {
    predictions = JSON.parse(fs.readFileSync(PREDICTIONS_FILE));
  }
  
  predictions.push({ ...prediction, realCandle: null });
  predictions = predictions.slice(-50);
  fs.writeFileSync(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2));
  
  console.log('\n📈 Prediction Summary:');
  console.log(`  Signal: ${prediction.signal}`);
  console.log(`  Predicted: $${prediction.open} → $${prediction.close}`);
  console.log(`  Range: $${prediction.low} - $${prediction.high}`);
  console.log(`  Change: ${prediction.predictedChange}`);
  console.log('\n✅ Prediction saved!');
  
  return prediction;
}

if (require.main === module) {
  runPrediction().catch(console.error);
}

module.exports = { runPrediction, generatePrediction, fetchAndSaveRealData };
