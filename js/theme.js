'use strict';

// ═══════════════════════════════════════════════
// Theme
// ═══════════════════════════════════════════════
const VALID_THEMES = ['dark','light','cyberpunk','green','pooh'];
const POOH_GIFS = ['resoruce/pooh_1.gif','resoruce/pooh_2.gif','resoruce/pooh_3.gif'];
let poohTimer = null;

let lastPoohGif = '';
function randomPoohGif() {
  const candidates = POOH_GIFS.filter(g => g !== lastPoohGif);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  lastPoohGif = pick;
  return pick;
}

function startPoohGif() {
  stopPoohGif();
  const wrap = document.getElementById('pooh-gif-wrap');
  const img  = document.getElementById('pooh-gif');
  if (!wrap || !img) return;
  img.src = randomPoohGif();
  wrap.classList.add('visible');
  poohTimer = setInterval(() => { img.src = randomPoohGif(); }, 10000);
}

function stopPoohGif() {
  const wrap = document.getElementById('pooh-gif-wrap');
  if (wrap) wrap.classList.remove('visible');
  if (poohTimer) { clearInterval(poohTimer); poohTimer = null; }
}

function applyTheme(theme) {
  if (!VALID_THEMES.includes(theme)) theme = 'dark';
  currentTheme = theme;
  document.body.dataset.theme = theme;
  const sel = document.getElementById('theme-select');
  if (sel) sel.value = theme;
  try { localStorage.setItem('rtp_theme', theme); } catch (_) {}
  if (theme === 'pooh') startPoohGif(); else stopPoohGif();
}

function initTheme() {
  let theme = 'dark';
  try {
    const saved = localStorage.getItem('rtp_theme');
    if (VALID_THEMES.includes(saved)) theme = saved;
  } catch (_) { theme = 'dark'; }
  applyTheme(theme);
}

initTheme();

// ═══════════════════════════════════════════════
// Cyberpunk button glow tracking
// ═══════════════════════════════════════════════
document.addEventListener('mousemove', function(e) {
  if (currentTheme !== 'cyberpunk') return;
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  btn.style.setProperty('--glow-x', (e.clientX - rect.left) + 'px');
  btn.style.setProperty('--glow-y', (e.clientY - rect.top) + 'px');
});
