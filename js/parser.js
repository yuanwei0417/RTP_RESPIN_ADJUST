'use strict';

// ═══════════════════════════════════════════════
// parser.js — Excel sheet parsing (multi-segment)
// Load order: 5/8
// Depends on: helpers.js (segments, wb, calcGR19)
//             save.js (setGlobalStatus, clearGlobalStatus)
//             renderer.js (renderAllSegments)
// Row 0: segment name cells (string) + cycle in adjacent cell
// Row 1: header labels (5 cols per segment)
// Row 2+: data rows (5 cols per segment)
// ═══════════════════════════════════════════════
function parseSheet() {
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const ref = XLSX.utils.decode_range(ws['!ref']);

  const getCellVal = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return cell != null ? cell.v : null;
  };
  const getCellStr = (r, c) => {
    const v = getCellVal(r, c);
    return (v != null && v !== '') ? String(v).trim() : null;
  };

  // ── Scan row 0 for segment names (must be string cells) ──
  const segmentMetas = [];
  for (let c = 0; c <= ref.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (!cell || cell.t !== 's') continue;
    const name = String(cell.v).trim();
    if (!name) continue;

    const cycleVal = getCellVal(0, c + 1);
    const cycle = (typeof cycleVal === 'number' && cycleVal >= 1)
      ? Math.round(cycleVal) : 1;

    const headers = [];
    for (let hc = c; hc < c + 5; hc++) {
      headers.push(getCellStr(1, hc) || '');
    }

    segmentMetas.push({ name, cycle, startCol: c, headers });
  }

  if (segmentMetas.length === 0) {
    setGlobalStatus(
      '找不到有效的表格名稱，請確認 Excel 格式（第一列需含 MG/FG/BG 等表格名稱）。',
      'error'
    );
    return;
  }

  // ── Parse data rows for each segment (row 2 onwards) ──
  const safeN = v => (v == null || isNaN(+v)) ? 0 : +v;
  const newSegments = [];

  segmentMetas.forEach(meta => {
    const sRows = [];
    for (let r = 2; r <= ref.e.r; r++) {
      const c  = meta.startCol;
      const v0 = getCellVal(r, c);
      const v1 = getCellVal(r, c + 1);
      const v2 = getCellVal(r, c + 2);
      const v3 = getCellVal(r, c + 3);
      const v4 = getCellVal(r, c + 4);

      if (v0 == null && v1 == null && v2 == null && v3 == null && v4 == null) continue;

      if (typeof v0 === 'string' || typeof v1 === 'string' ||
          typeof v2 === 'string' || typeof v3 === 'string' || typeof v4 === 'string') continue;

      const avg  = safeN(v2);
      const prob = safeN(v3);
      let respin = safeN(v4);
      // Values >= 2 are treated as ×10000; values in [0, 1] are already normalised.
      if (respin >= 2) respin = respin / 10000;

      sRows.push({
        rowIdx:   r + 1,
        rangeMin: safeN(v0),
        rangeMax: safeN(v1),
        avg,
        prob,
        respin,
        locked:   false,
      });
    }

    while (sRows.length > 0) {
      const last = sRows[sRows.length - 1];
      if (last.avg === 0 && last.prob === 0 && last.respin === 0) sRows.pop();
      else break;
    }

    if (sRows.length === 0) return;

    const backupR    = sRows.map(r => r.respin);
    const originalGR = calcGR19(sRows);

    sRows.forEach(r => { if (r.respin === 0 || r.respin === 1) r.locked = true; });

    newSegments.push({
      name:       meta.name,
      cycle:      meta.cycle,
      backupCycle: meta.cycle,
      startCol:   meta.startCol,
      headers:    meta.headers,
      rows:       sRows,
      backupR,
      originalGR,
    });
  });

  if (newSegments.length === 0) {
    setGlobalStatus('找不到有效資料列，請確認 Excel 格式。', 'error');
    return;
  }

  segments = newSegments;
  clearGlobalStatus();
  renderAllSegments();
  document.getElementById('dl-btn').classList.remove('hidden');
}
