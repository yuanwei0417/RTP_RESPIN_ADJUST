'use strict';

// ═══════════════════════════════════════════════
// game-picker.js — Game selection, variant toggle, file upload
// Load order: 6/8
// Depends on: helpers.js (allGames, selectedGame, currentVariant,
//             serverAvail, wb, fileName)
//             save.js (setGlobalStatus)
//             parser.js (parseSheet)
// ═══════════════════════════════════════════════
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });

async function initGameList() {
  try {
    const resp = await fetch('/api/games');
    if (!resp.ok) throw new Error(resp.status);
    allGames    = await resp.json();
    serverAvail = true;
    renderGameList(allGames);
  } catch (_) {
    serverAvail = false;
  }
}

function getGameInfo(name) {
  return allGames.find(g => g.name === name);
}

function updateExtraToggle(game) {
  const toggle = document.getElementById('extra-toggle');
  const cb     = document.getElementById('extra-cb');
  if (!game || !game.hasSubfolders) {
    cb.checked  = false;
    cb.disabled = true;
    toggle.classList.add('disabled');
    currentVariant = '';
  } else {
    cb.disabled = false;
    cb.checked  = false;
    toggle.classList.remove('disabled');
    currentVariant = '一般';
  }
}

function onExtraToggle() {
  const cb = document.getElementById('extra-cb');
  currentVariant = cb.checked ? '額外' : '一般';
  if (selectedGame) fetchGameData(selectedGame, currentVariant);
}

function renderGameList(list) {
  const el = document.getElementById('game-list');
  el.innerHTML = '';
  list.forEach(g => {
    const div = document.createElement('div');
    div.className = 'game-item' + (g.name === selectedGame ? ' active' : '');
    div.textContent = g.name;
    div.onclick = () => selectGame(g.name);
    el.appendChild(div);
  });
}

function openGameList() {
  if (!serverAvail || allGames.length === 0) return;
  document.getElementById('game-list').classList.add('open');
}

function filterGameList() {
  const q = document.getElementById('game-search').value.toLowerCase();
  const filtered = allGames.filter(g => g.name.toLowerCase().includes(q));
  renderGameList(filtered);
  document.getElementById('game-list').classList.add('open');
}

document.addEventListener('click', e => {
  const picker = document.getElementById('game-picker');
  if (!picker.contains(e.target)) {
    document.getElementById('game-list').classList.remove('open');
  }
});

async function selectGame(name) {
  document.getElementById('game-list').classList.remove('open');
  document.getElementById('game-search').value = '';
  selectedGame = name;

  const game = getGameInfo(name);
  updateExtraToggle(game);

  await fetchGameData(name, currentVariant);
}

async function fetchGameData(name, variant) {
  const variantLabel = variant ? ` [${variant}]` : '';
  document.getElementById('game-current').textContent = name + variantLabel + ' 載入中...';

  try {
    let apiUrl = `/api/games/${encodeURIComponent(name)}/latest`;
    if (variant) apiUrl += `?variant=${encodeURIComponent(variant)}`;
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error('找不到 xlsx 檔案');
    const fnHeader = resp.headers.get('X-Filename');
    fileName = fnHeader ? decodeURIComponent(fnHeader) : (name + '.xlsx');
    const buf = await resp.arrayBuffer();
    wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    document.getElementById('game-current').textContent = name + variantLabel + ' — ' + fileName;
    parseSheet();
  } catch (err) {
    document.getElementById('game-current').textContent = name + variantLabel;
    setGlobalStatus('載入失敗：' + err.message, 'error');
  }
}

function loadFile(file) {
  fileName = file.name;
  selectedGame = '';
  updateExtraToggle(null);
  document.getElementById('game-current').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      wb = XLSX.read(ev.target.result, { type: 'array' });
      parseSheet();
    } catch (err) {
      setGlobalStatus('讀取 Excel 失敗：' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

initGameList();
