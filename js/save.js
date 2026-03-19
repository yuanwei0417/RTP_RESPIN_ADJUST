'use strict';

// ═══════════════════════════════════════════════
// save.js — Save/download Excel + status helpers
// Load order: 2/8
// Depends on: helpers.js (segments, wb, fileName, selectedGame,
//             serverAvail, currentVariant, toX4)
// ═══════════════════════════════════════════════
function makeTimestamp() {
  const now = new Date();
  return String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
}

function prepareWbForSave() {
  if (!wb) return;
  const ws = wb.Sheets[wb.SheetNames[0]];
  segments.forEach(seg => {
    // Save cycle back to header row (row 0, col = startCol + 1)
    const cycleCol = seg.startCol + 1;
    const cycleAddr = XLSX.utils.encode_cell({ r: 0, c: cycleCol });
    const cycleVal = seg.cycle;
    if (ws[cycleAddr]) { ws[cycleAddr].v = cycleVal; ws[cycleAddr].t = 'n'; delete ws[cycleAddr].f; }
    else ws[cycleAddr] = { v: cycleVal, t: 'n' };

    const respinCol = seg.startCol + 4;
    seg.rows.forEach(row => {
      const addr = XLSX.utils.encode_cell({ r: row.rowIdx - 1, c: respinCol });
      const x4val = toX4(row.respin);
      if (ws[addr]) { ws[addr].v = x4val; ws[addr].t = 'n'; delete ws[addr].f; }
      else ws[addr] = { v: x4val, t: 'n' };
    });
  });
}

async function saveExcel() {
  if (!wb) return;
  prepareWbForSave();
  const ts = makeTimestamp();

  if (selectedGame && serverAvail) {
    const outName = selectedGame + '_' + ts + '.xlsx';
    const wbout   = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    try {
      let saveUrl = `/api/games/${encodeURIComponent(selectedGame)}/save?filename=${encodeURIComponent(outName)}`;
      if (currentVariant) saveUrl += `&variant=${encodeURIComponent(currentVariant)}`;
      const resp = await fetch(
        saveUrl,
        { method: 'POST', body: new Uint8Array(wbout) }
      );
      if (!resp.ok) throw new Error('Server error ' + resp.status);
      const result = await resp.json();
      setGlobalStatus('已儲存：' + result.path, 'success');
    } catch (err) {
      setGlobalStatus('儲存失敗：' + err.message + '，改為瀏覽器下載', 'error');
      fallbackDownload(ts);
    }
  } else {
    fallbackDownload(ts);
  }
}

function fallbackDownload(ts) {
  const baseName = selectedGame || fileName.replace(/\.xlsx?$/i, '');
  const outName  = baseName + '_' + ts + '.xlsx';
  XLSX.writeFile(wb, outName);
  setGlobalStatus('已下載：' + outName, 'success');
}

// ═══════════════════════════════════════════════
// Status helpers
// ═══════════════════════════════════════════════
function setSegStatus(si, msg, type) {
  const el = document.getElementById(`seg-status-${si}`);
  if (el) { el.textContent = msg; el.className = 'status-msg ' + type; }
}

function setGlobalStatus(msg, type) {
  const el = document.getElementById('global-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'status-msg ' + type;
  el.style.display = 'block';
}

function clearGlobalStatus() {
  const el = document.getElementById('global-status');
  if (el) { el.textContent = ''; el.className = 'status-msg'; el.style.display = 'none'; }
}
