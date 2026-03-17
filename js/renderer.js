'use strict';

// ═══════════════════════════════════════════════
// Render All Segments
// ═══════════════════════════════════════════════
function renderAllSegments() {
  const segBlocks = document.getElementById('seg-gr-blocks');
  segBlocks.innerHTML = '';
  segments.forEach((seg, si) => {
    const sep = document.createElement('div');
    sep.className = 'gr-sep';
    segBlocks.appendChild(sep);

    const block = document.createElement('div');
    block.className = 'gr-block';
    block.innerHTML = `
      <span class="glabel">${esc(seg.name)}</span>
      <span class="gvalue dim" id="gr-seg-${si}">—</span>
    `;
    segBlocks.appendChild(block);
  });

  const container = document.getElementById('segments-container');
  container.innerHTML = '';
  segments.forEach((seg, si) => {
    const card = buildSegmentCard(seg, si);
    container.appendChild(card);
    makeCollapsible(`seg-hdr-${si}`, `seg-body-${si}`, `seg-btn-${si}`);
    renderSegmentRows(si);

    const gr19  = calcGR19(seg.rows);
    const topEl = document.getElementById(`gr-seg-${si}`);
    if (topEl) { topEl.textContent = fmtPct(gr19 / seg.cycle); topEl.className = 'gvalue neutral'; }
  });

  recalcTotalGR();
}

function buildSegmentCard(seg, si) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = `seg-card-${si}`;

  const h0 = esc(seg.headers[0] || '下限');
  const h1 = esc(seg.headers[1] || '上限');
  const h2 = esc(seg.headers[2] || '平均倍率');
  const h3 = esc(seg.headers[3] || '機率');

  card.innerHTML = `
    <div class="card-header" id="seg-hdr-${si}">
      <div style="display:flex;align-items:center;">
        <h2>${esc(seg.name)}</h2>
        <span class="cycle-tag">週期</span>
        <input class="cycle-input" id="seg-cycle-${si}" type="number"
          value="${seg.cycle}" min="1" step="1"
          title="週期：調整後所有 GR 顯示會除以此值"
          oninput="onCycleChange(${si}, this.value)">
        <span class="cycle-tag">局</span>
        <span class="badge">${seg.rows.length} 列</span>
      </div>
      <button class="collapse-btn" id="seg-btn-${si}">收合 ▲</button>
    </div>
    <div class="card-body" id="seg-body-${si}">
      <div class="seg-body-wrap">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${h0}</th>
                <th>${h1}</th>
                <th>${h2}</th>
                <th>${h3}</th>
                <th>重轉機率 / 10000<span class="sub">可調整</span></th>
                <th>GR<span class="sub">per cycle</span></th>
              </tr>
            </thead>
            <tbody id="seg-tbody-${si}"></tbody>
          </table>
        </div>
        <div class="seg-ctrl">
          <div class="input-group">
            <label>目標 GR（%）</label>
            <input type="number" id="seg-target-${si}" placeholder="例：97" step="0.01" min="0">
          </div>
          <button class="btn btn-run" onclick="runOptimizeForSegment(${si})">▶ 執行調整</button>
          <button class="btn btn-reset" onclick="resetSegmentRespin(${si})">↺ 還原重轉</button>
          <div class="status-msg" id="seg-status-${si}"></div>
        </div>
      </div>
    </div>
  `;
  return card;
}

// ═══════════════════════════════════════════════
// Render rows for a single segment
// ═══════════════════════════════════════════════
function renderSegmentRows(si) {
  const seg   = segments[si];
  const tbody = document.getElementById(`seg-tbody-${si}`);
  tbody.innerHTML = '';

  const denom = getDenom(seg.rows);
  seg.rows.forEach((row, idx) => {
    const gr = calcGR(row, denom);
    const tr = document.createElement('tr');
    tr.id = `seg-${si}-tr-${idx}`;
    tr.innerHTML = `
      <td>${row.rowIdx}</td>
      <td class="range-cell">${row.rangeMin}</td>
      <td class="range-cell">${row.rangeMax}</td>
      <td>${fmt(row.avg)}</td>
      <td>${fmtPct(row.prob)}</td>
      <td class="respin-cell">
        <div class="respin-wrap">
          <input class="respin-input" id="seg-${si}-ri-${idx}" type="number"
            value="${toX4(row.respin)}" step="1" min="0" max="9999"
            onchange="onRespinChange(${si}, ${idx}, this.value)"
            title="重轉機率（×10000），範圍 1~9999">
          <button class="lock-btn" id="seg-${si}-lb-${idx}"
            onclick="toggleLock(${si}, ${idx})"
            title="鎖定後不被演算法調整">🔓</button>
        </div>
      </td>
      <td id="seg-${si}-grval-${idx}">${fmtPct(gr / seg.cycle)}</td>
    `;
    tbody.appendChild(tr);
    if (row.locked) applyLockUIForSeg(si, idx, true);
  });

  const gr19    = calcGR19(seg.rows);
  const sumProb = seg.rows.reduce((s, r) => s + r.prob, 0);
  const trS = document.createElement('tr');
  trS.className = 'sum-row';
  trS.innerHTML = `
    <td>Σ</td>
    <td>—</td><td>—</td><td>—</td>
    <td>${fmtPct(sumProb)}</td>
    <td>—</td>
    <td id="seg-${si}-sum-gr" class="cell-grval">${fmtPct(gr19 / seg.cycle)}</td>
  `;
  tbody.appendChild(trS);
}
