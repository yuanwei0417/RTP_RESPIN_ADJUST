'use strict';

// ═══════════════════════════════════════════════
// helpers.js — Constants, shared state, pure functions
// Load order: 1/8 (no dependencies, must be first)
// ═══════════════════════════════════════════════
const R_MIN = 0;
const R_MAX = 9999 / 10000;

// ═══════════════════════════════════════════════
// State (shared across all modules)
// ═══════════════════════════════════════════════
// segments: [{ name, cycle, backupCycle, startCol, headers, rows, backupR, originalGR }]
// rows:     [{ rowIdx, rangeMin, rangeMax, avg, prob, respin, locked }]
let segments = [];
let wb        = null;
let fileName  = '';
let currentTheme = 'dark';

// Game picker state
let allGames       = [];   // [{name, hasSubfolders}] from server
let selectedGame   = '';
let currentVariant = '';   // '' | '一般' | '額外'
let serverAvail    = false;

// Theme state
const VALID_THEMES = ['dark','light','cyberpunk','green','pooh'];
const POOH_GIFS    = ['resoruce/pooh_1.gif','resoruce/pooh_2.gif','resoruce/pooh_3.gif'];
let poohTimer   = null;
let lastPoohGif = '';

// ═══════════════════════════════════════════════
// Pure helpers
// ═══════════════════════════════════════════════
const clip    = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const fmt     = (v, d = 4) => Number(v).toFixed(d);
const fmtE    = (v, d = 3) => Number(v).toExponential(d);
const fmtPct  = v => (Number(v) * 100).toFixed(2) + '%';
const toX4    = v => Math.round(Number(v) * 10000);
const esc     = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function calcGR19(arr) {
  let num = 0, den = 0;
  arr.forEach(r => {
    const w = r.prob * (1 - r.respin);
    num += w * r.avg;
    den += w;
  });
  return den === 0 ? 0 : num / den;
}

function calcGR(r, denom) {
  return denom > 0 ? r.prob * (1 - r.respin) * r.avg / denom : 0;
}

function getDenom(arr) {
  return arr.reduce((s, r) => s + r.prob * (1 - r.respin), 0);
}
