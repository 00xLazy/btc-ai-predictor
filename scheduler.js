/**
 * BTC AI Predictor - Scheduler
 * Runs prediction every 4 hours
 */

const { spawn } = require('child_process');

const INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

console.log('⏰ Scheduler: Run prediction every 4 hours');

function run() {
  const child = spawn('node', ['predict.js'], { cwd: __dirname });
  
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  
  child.on('close', code => {
    console.log(`[${new Date().toISOString()}] ${code === 0 ? '✅' : '❌'} Done\n`);
    setTimeout(run, INTERVAL);
  });
}

run();

process.on('SIGINT', () => { console.log('\n🛑 Stopped'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🛑 Stopped'); process.exit(0); });
