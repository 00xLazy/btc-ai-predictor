/**
 * BTC AI Predictor - Fully Self-Contained Version
 * Works on any server without local dependencies
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_DIR = './data';
const PREDICTIONS_FILE = './data/predictions.json';
const REAL_DATA_FILE = './data/real-candles.json';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Fetch Binance 4h candles
async function getBinanceKlines(limit = 100) {
  try {
    const r = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol: 'BTCUSDT', interval: '4h', limit }
    });
    return r.data.map(k => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (e) {
    console.error('Binance error:', e.message);
    return null;
  }
}

// Calculate RSI
function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = [], losses = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i-1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = gains.slice(-period).reduce((a,b)=>a+b,0) / period;
  let avgLoss = losses.slice(-period).reduce((a,b)=>a+b,0) / period;
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period-1) + gains[i]) / period;
    avgLoss = (avgLoss * (period-1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

// Calculate MACD
function calcMACD(prices) {
  if (prices.length < 26) return { macd: 0, signal: 0, hist: 0 };
  const ema = (data, p) => {
    const m = 2 / (p + 1);
    let e = [data[0]];
    for (let i = 1; i < data.length; i++) e.push(m * data[i] + (1-m) * e[i-1]);
    return e;
  };
  const ema12 = ema(prices.slice(-26), 12);
  const ema26 = ema(prices.slice(-26), 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const sig = ema(macdLine, 9);
  return { macd: macdLine[macdLine.length-1], signal: sig[sig.length-1], hist: macdLine[macdLine.length-1] - sig[sig.length-1] };
}

// Generate AI signal from price data only
function generateSignal(candles) {
  if (!candles || candles.length === 0) return { name: '观望', confidence: 0.45 };
  
  const prices = candles.map(c => c.close);
  const last = candles[candles.length - 1];
  const rsi = calcRSI(prices);
  const macd = calcMACD(prices);
  
  // 24h change
  const change24h = candles.length >= 7 
    ? (last.close - candles[candles.length - 7].close) / candles[candles.length - 7].close * 100 
    : 0;
  
  let score = 0;
  
  // RSI scoring
  if (rsi < 25) score += 3;
  else if (rsi < 35) score += 1.5;
  else if (rsi > 75) score -= 3;
  else if (rsi > 65) score -= 1.5;
  
  // MACD scoring
  if (macd.hist > 0) score += 2;
  else if (macd.hist < -100) score -= 2;
  
  // 24h change
  if (change24h < -5) score += 2;
  else if (change24h > 5) score -= 2;
  
  // Generate signal
  if (score >= 3) return { name: '买入', confidence: Math.min(0.80, 0.55 + score * 0.02) };
  if (score >= 1) return { name: '谨慎买入', confidence: Math.min(0.70, 0.50 + score * 0.02) };
  if (score <= -3) return { name: '卖出', confidence: Math.min(0.80, 0.55 + Math.abs(score) * 0.02) };
  if (score <= -1) return { name: '谨慎卖出', confidence: Math.min(0.70, 0.50 + Math.abs(score) * 0.02) };
  return { name: '观望', confidence: 0.45 };
}

// Generate prediction candle
function generatePrediction(lastCandle, signal) {
  const { name, confidence } = signal;
  const { high, low, close } = lastCandle;
  const volatility = (high - low) / close * 100;
  
  let predictedChange = 0;
  switch (name) {
    case '买入': predictedChange = confidence * 0.025; break;
    case '谨慎买入': predictedChange = confidence * 0.018; break;
    case '卖出': predictedChange = -confidence * 0.025; break;
    case '谨慎卖出': predictedChange = -confidence * 0.018; break;
    default: predictedChange = (Math.random() - 0.5) * 0.006;
  }
  
  const predictedClose = close * (1 + predictedChange);
  const range = close * (volatility / 100);
  
  let predictedHigh, predictedLow;
  if (predictedChange > 0) {
    predictedHigh = close + range * (0.5 + Math.random() * 0.3);
    predictedLow = close - range * (0.2 + Math.random() * 0.2);
  } else {
    predictedHigh = close + range * (0.2 + Math.random() * 0.2);
    predictedLow = close - range * (0.5 + Math.random() * 0.3);
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
  console.log('🤖 BTC AI Predictor v2.0');
  console.log('='.repeat(40));
  
  const candles = await getBinanceKlines(100);
  if (!candles || candles.length === 0) {
    console.error('❌ Failed to fetch Binance data');
    return null;
  }
  
  // Save real candles
  fs.writeFileSync(REAL_DATA_FILE, JSON.stringify(candles, null, 2));
  console.log(`✅ Saved ${candles.length} real candles`);
  
  const lastCandle = candles[candles.length - 1];
  console.log(`📊 Last candle: $${lastCandle.close.toLocaleString()}`);
  
  // Generate signal
  const signal = generateSignal(candles);
  console.log(`🤖 AI Signal: ${signal.name} (${(signal.confidence * 100).toFixed(0)}%)`);
  
  // Generate prediction
  const prediction = generatePrediction(lastCandle, signal);
  
  // Save prediction
  let predictions = [];
  if (fs.existsSync(PREDICTIONS_FILE)) {
    predictions = JSON.parse(fs.readFileSync(PREDICTIONS_FILE));
  }
  predictions.push({ ...prediction, realCandle: null });
  predictions = predictions.slice(-50);
  fs.writeFileSync(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2));
  
  console.log(`\n📈 Prediction:`);
  console.log(`   ${prediction.open} → ${prediction.close} (${prediction.predictedChange})`);
  console.log(`   Range: ${prediction.low} - ${prediction.high}`);
  console.log('\n✅ Saved!');
  
  return prediction;
}

if (require.main === module) {
  runPrediction().catch(console.error);
}

module.exports = { runPrediction, generateSignal, getBinanceKlines };
