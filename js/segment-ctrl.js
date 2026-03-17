'use strict';

// ═══════════════════════════════════════════════
// Refresh GR column + top block for one segment
// ═══════════════════════════════════════════════
function refreshSegmentGR(si) {
  const seg   = segments[si];
  const denom = getDenom(seg.rows);

  seg.rows.forEach((row, idx) => {
    const el = document.getElementById(`seg-${si}-grval-${idx}`);
    if (el) el.textContent = fmtPct(calcGR(row, denom) / seg.cycle);
  });

  const gr19  = calcGR19(seg.rows);
  const sumEl = document.getElementById(`seg-${si}-sum-gr`);
  if (sumEl) sumEl.textContent = fmtPct(gr19 / seg.cycle);

  const topEl = document.getElementById(`gr-seg-${si}`);
  if (topEl) { topEl.textContent = fmtPct(gr19 / seg.cycle); topEl.className = 'gvalue neutral'; }

  recalcTotalGR();
}

// ═══════════════════════════════════════════════
// Total GR  (sum of each segment's GR/cycle)
// ═══════════════════════════════════════════════
function recalcTotalGR() {
  let total = 0;
  segments.forEach(seg => { total += calcGR19(seg.rows) / seg.cycle; });
  const el = document.getElementById('gr-total');
  if (el) { el.textContent = fmtPct(total); el.className = 'gvalue total-gr'; }
}

// ═══════════════════════════════════════════════
// Respin change & Lock
// ═══════════════════════════════════════════════
function onRespinChange(si, idx, val) {
  const seg = segments[si];
  const x4  = parseFloat(val);
  if (isNaN(x4) || x4 < 0 || x4 > 9999) {
    setSegStatus(si, '重轉機率（×10000）必須在 0 ~ 9999 之間', 'error');
    const inp = document.getElementById(`seg-${si}-ri-${idx}`);
    if (inp) inp.value = toX4(seg.rows[idx].respin);
    return;
  }
  seg.rows[idx].respin = x4 / 10000;
  refreshSegmentGR(si);
}

function toggleLock(si, idx) {
  const seg = segments[si];
  seg.rows[idx].locked = !seg.rows[idx].locked;
  applyLockUIForSeg(si, idx, seg.rows[idx].locked);
}

function applyLockUIForSeg(si, idx, locked) {
  const inp = document.getElementById(`seg-${si}-ri-${idx}`);
  const btn = document.getElementById(`seg-${si}-lb-${idx}`);
  if (locked) {
    if (inp) inp.disabled = true;
    if (btn) { btn.textContent = '🔒'; btn.style.color = '#f7a07e'; btn.title = '此列已鎖定，演算法不會調整'; }
  } else {
    if (inp) inp.disabled = false;
    if (btn) { btn.textContent = '🔓'; btn.style.color = ''; btn.title = '鎖定後不被演算法調整'; }
  }
}

// ═══════════════════════════════════════════════
// Reset one segment
// ═══════════════════════════════════════════════
function resetSegmentRespin(si) {
  const seg = segments[si];
  seg.rows.forEach((r, i) => { r.respin = seg.backupR[i]; });
  seg.rows.forEach((r, i) => {
    const inp = document.getElementById(`seg-${si}-ri-${i}`);
    if (inp) inp.value = toX4(seg.backupR[i]);
  });
  seg.cycle = seg.backupCycle;
  const cycleInp = document.getElementById(`seg-cycle-${si}`);
  if (cycleInp) cycleInp.value = seg.backupCycle;
  refreshSegmentGR(si);
  setSegStatus(si, '重轉機率與週期已還原至原始數值。', 'info');
}

// ═══════════════════════════════════════════════
// Cycle change
// ═══════════════════════════════════════════════
function onCycleChange(si, val) {
  const raw = val.trim();
  if (raw === '') return;
  let v = parseInt(raw, 10);
  if (isNaN(v) || v < 1) return;
  segments[si].cycle = v;
  refreshSegmentGR(si);
}

// ═══════════════════════════════════════════════
// Collapse
// ═══════════════════════════════════════════════
function makeCollapsible(hId, bId, btnId) {
  const hdr = document.getElementById(hId);
  if (!hdr) return;
  hdr.addEventListener('click', (e) => {
    if (e.target.closest('input, button, select')) return;
    const b   = document.getElementById(bId);
    const btn = document.getElementById(btnId);
    b.classList.toggle('collapsed');
    btn.textContent = b.classList.contains('collapsed') ? '展開 ▼' : '收合 ▲';
  });
}
