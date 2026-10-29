'use strict';
// Usage:  node src/ml/cli.js generate | train | report
const { generateAll } = require('./dataset');
const { train, saveStore, loadStore } = require('./trainer');

function printReport(store) {
  console.log(`\nModels trained at ${store.trained_at} (${store.training_seconds}s)`);
  for (const [k, t] of Object.entries(store.tasks)) {
    console.log(`\n== ${t.title} (${t.target}) — ${t.rows} rows, ${t.split}`);
    for (const [id, r] of Object.entries(t.results)) {
      console.log(`  ${id === t.selected ? '★' : ' '} ${r.name.padEnd(40)} MAE ${String(r.mae).padEnd(7)} RMSE ${String(r.rmse).padEnd(7)} R² ${r.r2}`);
    }
    console.log(`  improvement vs old method: ${t.improvement_vs_baseline_pct}% lower RMSE`);
    console.log('  top features: ' + t.importances.slice(0, 4).map((i) => `${i.feature} ${(i.importance * 100).toFixed(0)}%`).join(', '));
  }
}

const cmd = process.argv[2];
if (cmd === 'generate') console.log('Dataset rows written:', generateAll());
else if (cmd === 'train') { const s = train(); saveStore(s); printReport(s); }
else if (cmd === 'report') { const s = loadStore(); if (!s) console.log('No trained models yet — run: npm run ml:train'); else printReport(s); }
else console.log('Usage: node src/ml/cli.js generate | train | report');
