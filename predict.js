/**
 * BTC AI Predictor v3.0 - 更果断的信号系统
 */

const axios = require('axios');
const fs = require('fs');

const DATA_DIR = './data';
const PREDICTIONS_FILE = './data/predictions.json';
const REAL_DATA_FILE = './data/real-candles.json';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Fetch Binance 4h candles
async function getBinanceKlines(limit = 100) {
  try {
    const r = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol: 'BTCUSDT', interval: '4h', limit }
    });
    return r.data.map(k => ({
      time: k[0] / 1000, open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
    }));
  } catch (e) { return null; }
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
  return macdLine[macdLine.length-1] - sig[sig.length-1];
}

// Simple trend detection
function getTrend(prices) {
  if (prices.length < 20) return 0;
  const ma20 = prices.slice(-20).reduce((a,b)=>a+b,0) / 20;
  const ma5 = prices.slice(-5).reduce((a,b)=>a+b,0) / 5;
  return (ma5 - ma20) / ma20 * 100;
}

// Generate signal - 更果断！
function generateSignal(candles) {
  if (!candles || candles.length === 0) return { name: '观望', confidence: 0.50 };
  
  const prices = candles.map(c => c.close);
  const rsi = calcRSI(prices);
  const macdHist = calcMACD(prices);
  const trend = getTrend(prices);
  
  let score = 0;
  
  // RSI scoring - 极端值更有意义
  if (rsi < 25) score += 3;      // 超卖
  else if (rsi < 35) score += 1.5;
  else if (rsi > 75) score -= 3;  // 超买
  else if (rsi > 65) score -= 1.5;
  
  // MACD scoring
  if (macdHist > 0) score += 2;
  else if (macdHist < 0) score -= 2;
  
  // Trend scoring
  if (trend > 5) score += 1.5;   // 强势上涨
  else if (trend < -5) score -= 1.5;  // 强势下跌
  
  // 动量确认
  const momentum = (prices[prices.length-1] - prices[prices.length-5]) / prices[prices.length-5] * 100;
  if (momentum > 3) score += 1;
  else if (momentum < -3) score -= 1;
  
  // Generate signal - 扩大范围，让信号更果断
  const conf = 0.45 + Math.abs(score) * 0.05;
  
  if (score >= 2) return { name: '买入', confidence: Math.min(0.85, conf) };
  if (score >= 0.5) return { name: '谨慎买入', confidence: Math.min(0.70, conf) };
  if (score <= -2) return { name: '卖出', confidence: Math.min(0.85, conf) };
  if (score <= -0.5) return { name: '谨慎卖出', confidence: Math.min(0.70, conf) };
  
  // 趋势方向给一个默认方向
  if (trend > 0) return { name: '谨慎买入', confidence: 0.55 };
  if (trend < 0) return { name: '谨慎卖出', confidence: 0.55 };
  
  return { name: '观望', confidence: 0.50 };
}

// Generate prediction candle
function generatePrediction(lastCandle, signal) {
  const { name, confidence } = signal;
  const { high, low, close } = lastCandle;
  const volatility = (high - low) / close * 100;
  
  let predictedChange = 0;
  switch (name) {
    case '买入': predictedChange = confidence * 0.03; break;
    case '谨慎买入': predictedChange = confidence * 0.02; break;
    case '卖出': predictedChange = -confidence * 0.03; break;
    case '谨慎卖出': predictedChange = -confidence * 0.02; break;
    default: predictedChange = (Math.random() - 0.5) * 0.005;
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

async function runPrediction() {
  console.log('🤖 BTC AI Predictor v3.0');
  console.log('='.repeat(40));
  
  const candles = await getBinanceKlines(100);
  if (!candles) { console.error('❌ Failed to fetch data'); return null; }
  
  fs.writeFileSync(REAL_DATA_FILE, JSON.stringify(candles, null, 2));
  console.log(`✅ Saved ${candles.length} candles`);
  
  const lastCandle = candles[candles.length - 1];
  console.log(`📊 Price: $${lastCandle.close.toLocaleString()}`);
  
  const signal = generateSignal(candles);
  console.log(`🤖 Signal: ${signal.name} (${(signal.confidence * 100).toFixed(0)}%)`);
  
  const prediction = generatePrediction(lastCandle, signal);
  
  let predictions = [];
  if (fs.existsSync(PREDICTIONS_FILE)) {
    predictions = JSON.parse(fs.readFileSync(PREDICTIONS_FILE));
  }
  predictions.push({ ...prediction, realCandle: null });
  predictions = predictions.slice(-50);
  fs.writeFileSync(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2));
  
  console.log(`\n📈 ${prediction.open} → ${prediction.close} (${prediction.predictedChange})`);
  console.log('✅ Done!');
  
  return prediction;
}

if (require.main === module) runPrediction().catch(console.error);
module.exports = { runPrediction, generateSignal };
