'use strict';
// Small seeded random-number helper so the generated datasets and the trained
// models are 100% reproducible (same seed -> same CSV files -> same metrics).
function makeRng(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  next.normal = (mean = 0, sd = 1) => {
    const u = 1 - next(), v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  next.poisson = (lambda) => {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(next.normal(lambda, Math.sqrt(lambda))));
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= next(); } while (p > L);
    return k - 1;
  };
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  next.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };
  return next;
}
module.exports = { makeRng };
