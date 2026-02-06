/**
 * BTC AI Predictor - Web Server (Self-Contained)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PREDICTIONS_FILE = './data/predictions.json';
const REAL_DATA_FILE = './data/real-candles.json';

// Ensure data directory
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });

// Get predictions
app.get('/api/predictions', (req, res) => {
  try {
    const data = fs.existsSync(PREDICTIONS_FILE) 
      ? JSON.parse(fs.readFileSync(PREDICTIONS_FILE)) : [];
    res.json(data);
  } catch (e) { res.json([]); }
});

// Get real candles
app.get('/api/real', (req, res) => {
  try {
    const data = fs.existsSync(REAL_DATA_FILE) 
      ? JSON.parse(fs.readFileSync(REAL_DATA_FILE)) : [];
    res.json(data);
  } catch (e) { res.json([]); }
});

// Get comparison with accuracy
app.get('/api/comparison', (req, res) => {
  try {
    const predictions = fs.existsSync(PREDICTIONS_FILE) 
      ? JSON.parse(fs.readFileSync(PREDICTIONS_FILE)) : [];
    const realCandles = fs.existsSync(REAL_DATA_FILE) 
      ? JSON.parse(fs.readFileSync(REAL_DATA_FILE)) : [];
    
    const comparisons = predictions.map(pred => {
      const realMatch = realCandles.find(c => 
        Math.abs(c.time - pred.time) < (4 * 60 * 60 * 1000)
      );
      return realMatch ? { prediction: pred, real: realMatch, accuracy: calcAccuracy(pred, realMatch) } : null;
    }).filter(c => c && c.real);
    
    res.json(comparisons);
  } catch (e) { res.json([]); }
});

// Get stats
app.get('/api/stats', (req, res) => {
  try {
    const predictions = fs.existsSync(PREDICTIONS_FILE) 
      ? JSON.parse(fs.readFileSync(PREDICTIONS_FILE)) : [];
    const realCandles = fs.existsSync(REAL_DATA_FILE) 
      ? JSON.parse(fs.readFileSync(REAL_DATA_FILE)) : [];
    
    const comparisons = predictions.map(pred => {
      const realMatch = realCandles.find(c => 
        Math.abs(c.time - pred.time) < (4 * 60 * 60 * 1000)
      );
      return realMatch ? calcAccuracy(pred, realMatch) : null;
    }).filter(a => a !== null);
    
    const correct = comparisons.filter(a => a.directionCorrect).length;
    
    res.json({
      totalPredictions: predictions.length,
      completedPredictions: comparisons.length,
      correctDirection: correct,
      accuracy: comparisons.length > 0 ? (correct / comparisons.length * 100).toFixed(1) + '%' : 'N/A',
      avgError: comparisons.length > 0
        ? (comparisons.reduce((sum, c) => sum + Math.abs(c.error), 0) / comparisons.length * 100).toFixed(2) + '%'
        : 'N/A'
    });
  } catch (e) { res.json({ error: e.message }); }
});

// Trigger prediction
app.post('/api/predict', async (req, res) => {
  try {
    const child = spawn('node', ['predict.js'], { cwd: __dirname });
    let output = '';
    child.stdout.on('data', d => output += d.toString());
    child.stderr.on('data', d => output += d.toString());
    child.on('close', () => {
      res.json({ success: true, output });
    });
  } catch (e) { res.json({ error: e.message }); }
});

function calcAccuracy(pred, real) {
  const predChange = (pred.close - pred.open) / pred.open * 100;
  const realChange = (real.close - real.open) / real.open * 100;
  return {
    directionCorrect: (predChange > 0 && realChange > 0) || (predChange < 0 && realChange < 0),
    error: Math.abs(predChange - realChange),
    predictedChange: predChange.toFixed(2) + '%',
    realChange: realChange.toFixed(2) + '%'
  };
}

app.listen(PORT, () => {
  console.log(`🚀 BTC AI Predictor running on http://localhost:${PORT}`);
  console.log(`📊 API: /api/predictions, /api/real, /api/comparison, /api/stats`);
  
  // Auto-run prediction on startup
  const predict = spawn('node', ['predict.js'], { cwd: __dirname });
  predict.stdout.on('data', d => process.stdout.write(d));
});
