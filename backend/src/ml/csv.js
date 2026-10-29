'use strict';
const fs = require('fs');
const path = require('path');

function esc(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, columns, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c])).join(','));
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function splitLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const cols = splitLine(lines[0]);
  return lines.slice(1).map((ln) => {
    const cells = splitLine(ln); const row = {};
    cols.forEach((c, i) => { const n = Number(cells[i]); row[c] = cells[i] !== '' && !Number.isNaN(n) ? n : cells[i]; });
    return row;
  });
}

module.exports = { writeCsv, readCsv };
