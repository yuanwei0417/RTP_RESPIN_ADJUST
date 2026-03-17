'use strict';

// ═══════════════════════════════════════════════
// Optimizer — Binary Search on Δ (per segment)
// ═══════════════════════════════════════════════
function runOptimizeForSegment(si) {
  const seg = segments[si];

  const cycleEl = document.getElementById(`seg-cycle-${si}`);
  if (cycleEl) {
    const v = parseInt(cycleEl.value, 10);
    if (!isNaN(v) && v >= 1) seg.cycle = v;
    else cycleEl.value = seg.cycle;
  }

  seg.rows.forEach((r, i) => { r.respin = seg.backupR[i]; });
  seg.rows.forEach((r, i) => {
    const inp = document.getElementById(`seg-${si}-ri-${i}`);
    if (inp) inp.value = toX4(seg.backupR[i]);
  });

  const targetPct = parseFloat(document.getElementById(`seg-target-${si}`).value);
  if (isNaN(targetPct) || targetPct <= 0) {
    setSegStatus(si, '請輸入有效的目標 GR 值（百分比，如 97 表示 97%）', 'error');
    return;
  }
  const target = (targetPct / 100) * seg.cycle;

  const unlocked = seg.rows.filter(r => !r.locked);
  if (unlocked.length === 0) {
    setSegStatus(si, '所有列都已鎖定，無法調整。請解鎖至少一列。', 'error');
    return;
  }

  const baseR = seg.rows.map(r => r.respin);

  function gr19ofD(d) {
    const snap = seg.rows.map((r, i) => ({
      avg:    r.avg,
      prob:   r.prob,
      respin: r.locked ? baseR[i] : clip(baseR[i] + d, R_MIN, R_MAX),
    }));
    return calcGR19(snap) * seg.cycle;
  }

  const baseG = gr19ofD(0);
  let gMin = baseG, gMax = baseG;
  let bracketLo = 0, bracketHi = 0;
  let foundBracket = false;

  for (let step = 0.01; step <= 1.0; step *= 2) {
    for (const d of [-step, step]) {
      const g = gr19ofD(d);
      if (g < gMin) { gMin = g; bracketLo = d; }
      if (g > gMax) { gMax = g; bracketHi = d; }
    }
    if (target >= gMin - 1e-9 && target <= gMax + 1e-9) { foundBracket = true; break; }
  }

  if (!foundBracket) {
    setSegStatus(si,
      `目標 ${fmtPct(target / seg.cycle)} 超出可調整範圍 ` +
      `[${fmtPct(gMin / seg.cycle)}, ${fmtPct(gMax / seg.cycle)}]。` +
      `目前 GR = ${fmtPct(baseG / seg.cycle)}`,
      'error'
    );
    return;
  }

  const decreasing = gr19ofD(bracketHi) < gr19ofD(bracketLo);
  let lo = bracketLo, hi = bracketHi, delta = 0;

  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const g   = gr19ofD(mid);
    if (Math.abs(g - target) < 1e-12) { delta = mid; break; }
    if (decreasing ? g > target : g < target) lo = mid;
    else hi = mid;
    delta = mid;
    if (Math.abs(hi - lo) < 1e-13) break;
  }

  const newR       = seg.rows.map((r, i) => r.locked ? baseR[i] : clip(baseR[i] + delta, R_MIN, R_MAX));
  const gr19New    = calcGR19(seg.rows.map((r, i) => ({ avg: r.avg, prob: r.prob, respin: newR[i] }))) * seg.cycle;
  const err        = Math.abs(gr19New - target);
  const ok         = err < 1e-4;

  seg.rows.forEach((r, i) => { r.respin = newR[i]; });
  seg.rows.forEach((r, i) => {
    const inp = document.getElementById(`seg-${si}-ri-${i}`);
    if (inp) inp.value = toX4(r.respin);
  });

  refreshSegmentGR(si);

  setSegStatus(si,
    `調整完成！GR = ${fmtPct(gr19New / seg.cycle)}，` +
    `目標 = ${fmtPct(target / seg.cycle)}，誤差 = ${fmtE(err)}`,
    ok ? 'success' : 'info'
  );
}
