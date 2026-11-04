// INTERLINK beta dashboard. DATA comes from data/data.js (built by scripts/build_interlink.py).
const TYPES = DATA.types;
const TYPE_KO = { 'Builder': '건축가', 'Fighter': '전투가', 'Explorer': '탐험가', 'Short visit': '잠깐 들른 사람' };
const TYPE_VAR = { 'Builder': '--t-builder', 'Fighter': '--t-fighter', 'Explorer': '--t-explorer', 'Short visit': '--t-short' };
const KINDS = ['Hub', 'Personal world', 'Dungeon', 'Mars', 'Library'];
const KIND_KO = { 'Hub': '허브', 'Personal world': '개인 월드', 'Dungeon': '던전', 'Mars': 'Mars', 'Library': 'Alexandria 도서관', 'Other': '기타' };
const KIND_VAR = { 'Hub': '--k-hub', 'Personal world': '--k-personal', 'Dungeon': '--k-dungeon', 'Mars': '--k-mars', 'Library': '--k-library' };
const GROUP_KO = { 'Gathering': '채집', 'Monster hunt': '몬스터 사냥', 'Workstation use': '작업대 사용', 'Dungeon clear': '던전 클리어', 'Craft & finish': '제작·완성', 'Facility upgrade': '시설 업그레이드', 'Journey B': 'Journey B', 'Journey D': 'Journey D', 'Journey O': 'Journey O' };
const DAYS = Array.from({ length: 11 }, (_, i) => `10/${12 + i}`);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const tcol = t => css(TYPE_VAR[t]);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
const fmtFull = n => n.toLocaleString('ko-KR');
const byId = Object.fromEntries(DATA.players.map(p => [p.id, p]));
let active = new Set(TYPES);
let bkind = 'All';
const BKINDS = [['All', '전체'], ['Personal world', '개인 월드'], ['Dungeon', '던전'], ['Mars', '화성'], ['Hub', '허브']];
const BNOTE = { 'All': '', 'Personal world': '개인 월드: 건축가는 1인 평균 22.5종으로 다양한 재료를 쓰고, 전투가는 Birch·Stone·Oak 3종이 55%로 단순합니다.', 'Dungeon': '던전: 건축가(34%)·전투가(48%) 모두 Deepslate가 1위입니다. 던전 안에서 캔 블록을 다시 놓는 것으로 보입니다.', 'Mars': '화성: 건축가 3명만 블록을 놓았고, Soul Sand·Basalt 같은 화성 블록이 대부분입니다.', 'Hub': '허브: 놓인 블록은 91개뿐이고 모두 탐험가 1명이 놓았습니다.' };
const btopOf = t => bkind === 'All' ? DATA.btop[t] : DATA.btopK[bkind][t];
const bpOf = t => bkind === 'All' ? DATA.bp[t] : DATA.bpK[bkind][t];
let selected = DATA.players.find(p => p.type === 'Builder').id;
const charts = {};
const tip = document.getElementById('tip');
function showTip(html, e) { tip.innerHTML = html; tip.hidden = false; const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8); const y = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 8); tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
function hideTip() { tip.hidden = true; }
function baseText() { return { color: css('--ink-2'), fontFamily: 'IBM Plex Sans KR, sans-serif', fontSize: 12 }; }
function tooltipStyle() { return { backgroundColor: css('--surface'), borderColor: css('--rule'), textStyle: { color: css('--ink'), fontSize: 12 }, extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:6px;' }; }
const vis = () => DATA.players.filter(p => active.has(p.type));

function renderFilters() {
  const f = document.getElementById('filters');
  f.querySelectorAll('.chip').forEach(c => c.remove());
  TYPES.forEach(t => {
    const n = DATA.players.filter(p => p.type === t).length;
    const b = document.createElement('button');
    b.className = 'chip'; b.setAttribute('aria-pressed', active.has(t));
    b.innerHTML = `<i class="sw" style="background:${tcol(t)}"></i>${TYPE_KO[t]} <span style="color:var(--ink-3)">${n}</span>`;
    b.onclick = () => { if (active.has(t) && active.size > 1) active.delete(t); else active.add(t); renderAll(); };
    f.appendChild(b);
  });
  document.getElementById('typeLegend').innerHTML = TYPES.map(t => `<span><i class="sw" style="background:${tcol(t)}"></i>${TYPE_KO[t]}</span>`).join('') + '<span style="color:var(--ink-3)">점 크기 = 플레이 시간</span>';
}
function renderKPIs() {
  const m = DATA.meta, ps = vis();
  const k = [
    ['플레이어', ps.length, ps.length === m.players ? `베타 10일 · 하루만 온 사람 ${DATA.players.filter(p => p.days === 1).length}명` : `전체 ${m.players}명 중`],
    ['플레이 시간', fmt(ps.reduce((s, p) => s + p.minutes, 0)) + '분', '플레이어-분 합계'],
    ['손으로 놓은 블록', fmt(ps.reduce((s, p) => s + p.placed, 0)), `${m.blockTypes}종 블록 사용`],
    ['던전 플레이', fmt(ps.reduce((s, p) => s + (p.kinds.Dungeon || 0), 0)) + '분', `던전 ${fmtFull(m.dungeons)}회 생성`],
    ['완료한 퀘스트', fmt(ps.reduce((s, p) => s + p.quests, 0)), `퀘스트 ID ${m.questIds}개 · 10/15부터`],
  ];
  document.getElementById('kpis').onclick = e => { const el = e.target.closest('.kpi'); if (el) showTypeSummary(['n', 'minutes', 'placed', 'dungeon', 'quests'][[...el.parentNode.children].indexOf(el)]); };
  document.getElementById('kpis').innerHTML = k.map(([a, b, c]) => `<div class="kpi clickable" title="눌러서 유형별 요약 보기"><span class="k">${a}</span><span class="v">${b}</span><span class="n">${c}</span></div>`).join('');
}

const RANKS = [
  ['placed', '놓은 블록', '개'], ['kills', '몬스터 처치', '회'], ['minutes', '플레이 시간', '분'],
];
function renderRanks() {
  const ps = vis(), el = document.getElementById('ranks');
  el.innerHTML = RANKS.map(([k, l, u]) => {
    const top = [...ps].sort((a, b) => b[k] - a[k] || b.minutes - a.minutes).slice(0, 1);
    return `<div class="rk"><h4 data-rk="${k}" title="전체 순위표 보기">${l} ›</h4><ol>${top.map((p, i) => `<li><span class="no">1위</span><a data-rp="${p.id}" title="${TYPE_KO[p.type]}"><i style="background:${tcol(p.type)}"></i>${p.id}</a><span class="val">${fmtFull(p[k])}${u}</span></li>`).join('')}</ol></div>`;
  }).join('');
  el.querySelectorAll('[data-rk]').forEach(h => h.onclick = () => { const k = h.dataset.rk, l = RANKS.find(r => r[0] === k)[1];
    showPlayers(`${l} 순위`, `선택한 유형의 플레이어를 ${l}이 많은 순서로 정렬했습니다. 위 1위는 이 표의 첫 줄입니다.`, vis(), [], k, [k], null, `파란 열 = ${l}`); });
  el.querySelectorAll('[data-rp]').forEach(a => a.onclick = () => { selected = a.dataset.rp; renderScatter(); renderCard(); document.getElementById('pcard').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
}

function renderScatter() {
  charts.scatter = charts.scatter || echarts.init(document.getElementById('scatter'));
  const maxM = Math.max(...DATA.players.map(p => p.minutes));
  const series = TYPES.filter(t => active.has(t)).map(t => ({
    name: t, type: 'scatter',
    data: DATA.players.filter(p => p.type === t).map(p => ({ value: [Math.max(p.zones, 1), p.placed + 1, p.minutes], id: p.id })),
    symbolSize: d => 6 + 30 * Math.sqrt(d[2] / maxM),
    itemStyle: { color: tcol(t), opacity: .85, borderColor: css('--surface'), borderWidth: 1.5 },
    emphasis: { focus: 'self', itemStyle: { borderColor: css('--ink'), borderWidth: 2 } },
    label: { show: true, formatter: p => p.data.id === selected ? p.data.id : '', position: 'right', color: css('--ink'), fontWeight: 600, fontSize: 12 },
  }));
  charts.scatter.setOption({
    animation: false, textStyle: baseText(),
    grid: { left: 58, right: 20, top: 12, bottom: 46 },
    tooltip: { ...tooltipStyle(), formatter: q => { const p = byId[q.data.id]; return `<b>${p.id}</b> · ${TYPE_KO[p.type]}<br>다닌 구역 ${fmtFull(p.zones)} · 놓은 블록 ${fmtFull(p.placed)}<br>공격 ${fmtFull(p.attacks)} · 플레이 ${fmtFull(p.minutes)}분`; } },
    xAxis: { type: 'log', name: '다닌 구역 수 (로그)', nameLocation: 'middle', nameGap: 28, min: 1, axisLine: { lineStyle: { color: css('--rule') } }, axisLabel: { color: css('--ink-3'), formatter: v => fmt(v) }, splitLine: { lineStyle: { color: css('--grid') } } },
    yAxis: { type: 'log', name: '놓은 블록 수 + 1 (로그)', nameLocation: 'middle', nameGap: 42, min: 1, axisLine: { show: false }, axisLabel: { color: css('--ink-3'), formatter: v => fmt(v) }, splitLine: { lineStyle: { color: css('--grid') } } },
    series,
  }, true);
  charts.scatter.off('click');
  charts.scatter.on('click', p => { selected = p.data.id; renderScatter(); renderCard(); showPlayers(`${p.data.id} 기록`, '엑셀 플레이어 시트의 이 사람 줄입니다. 위 카드에도 같은 기록이 나옵니다.', [byId[p.data.id]], [], 'minutes', ['zones', 'placed', 'minutes'], () => true, '점의 가로 = 다닌 구역, 세로 = 놓은 블록, 크기 = 플레이 시간'); });
}

function renderCard() {
  const p = byId[selected];
  const kinds = KINDS.map(k => [k, p.kinds[k] || 0]).filter(([, v]) => v > 0);
  const tot = kinds.reduce((s, [, v]) => s + v, 0);
  const rank = (v, lbl) => `<div style="display:grid;grid-template-columns:5em 1fr 3ch;gap:8px;align-items:center;font-size:12px"><span>${lbl}</span><span class="hbar" style="background:var(--surface-2)"><i style="width:${v * 100}%;background:var(--ink-3)"></i></span><span style="font-family:var(--f-mono)">${Math.round(v * 100)}</span></div>`;
  document.getElementById('pcard').innerHTML = `
    <h2>플레이어 기록 <span class="tag">검색 · 상세</span></h2>
    <div class="name">${p.id} <span class="pill" style="background:${tcol(p.type)}">${TYPE_KO[p.type]}</span></div>
    <label style="font-size:13px;color:var(--ink-2)">다른 플레이어 <select id="pPick" class="picker">${DATA.players.filter(x => active.has(x.type)).map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.id} · ${TYPE_KO[x.type]} · ${x.minutes}분</option>`).join('')}</select></label>
    <div class="stats">${[['플레이', fmtFull(p.minutes) + '분'], ['접속한 날', p.days + '일'], ['다닌 구역', fmtFull(p.zones)], ['놓은 블록', fmtFull(p.placed)], ['캔 블록', fmtFull(p.dug)], ['공격', fmtFull(p.attacks)], ['처치한 몬스터', fmtFull(p.kills)], ['제작', fmtFull(p.crafts)], ['완료 퀘스트', fmtFull(p.quests)]].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
    <p class="why" style="margin-top:4px">시간을 보낸 월드</p>
    <div class="hbar">${kinds.map(([k, v]) => `<i title="${KIND_KO[k]} ${Math.round(100 * v / tot)}%" style="width:${100 * v / tot}%;background:var(${KIND_VAR[k]})"></i>`).join('')}</div>
    <div class="legend">${kinds.map(([k, v]) => `<span><i class="sw" style="background:var(${KIND_VAR[k]})"></i>${KIND_KO[k]} ${Math.round(100 * v / tot)}%</span>`).join('')}</div>
    ${p.minutes >= 30 ? `<p class="why" style="margin-top:4px">분당 기록: 블록 수정(놓은+캔) ${((p.placed + p.dug) / p.minutes).toFixed(2)}개 (탐험가 기준 0.2개 미만) · 처치 ${(p.kills / p.minutes).toFixed(2)}회 (탐험가 기준 0.1회 미만)</p><p class="why">건축 점수 = 블록 수정/분 ÷ 3 = <b>${p.sb.toFixed(2)}</b> · 전투 점수 = 처치/분 ÷ 0.6 = <b>${p.sf.toFixed(2)}</b> → 큰 쪽이 유형</p>` : '<p class="why">30분 미만 플레이해서 잠깐 들른 사람으로 분류했습니다.</p>'}`;
  document.getElementById('pPick').onchange = e => { selected = e.target.value; renderScatter(); renderCard(); };
}

function renderSankey() {
  charts.sankey = charts.sankey || echarts.init(document.getElementById('sankey'));
  const links = DATA.sankey.filter(([t, k]) => active.has(t) && KIND_VAR[k]).map(([t, k, c]) => ({ source: TYPE_KO[t], target: KIND_KO[k], value: c, lineStyle: { color: tcol(t), opacity: .4 } }));
  const nodes = [...TYPES.filter(t => active.has(t)).map(t => ({ name: TYPE_KO[t], itemStyle: { color: tcol(t) } })), ...KINDS.map(k => ({ name: KIND_KO[k], itemStyle: { color: css(KIND_VAR[k]) } }))];
  charts.sankey.setOption({
    animation: false, textStyle: baseText(),
    tooltip: { ...tooltipStyle(), formatter: p => p.dataType === 'edge' ? `${p.data.source} → ${p.data.target}<br>${fmtFull(p.data.value)}분` : `${p.name}<br>${fmtFull(p.value)}분` },
    series: [{ type: 'sankey', left: 8, right: 130, top: 10, bottom: 10, nodeWidth: 12, nodeGap: 12, draggable: false, data: nodes, links,
      label: { color: css('--ink'), fontSize: 12 }, lineStyle: { curveness: .5 }, emphasis: { focus: 'adjacency' } }],
  }, true);
  charts.sankey.off('click'); charts.sankey.on('click', showSankey);
}

function renderDaily() {
  charts.daily = charts.daily || echarts.init(document.getElementById('daily'));
  charts.daily.setOption({
    animation: false, textStyle: baseText(),
    grid: { left: 40, right: 12, top: 36, bottom: 30 },
    legend: { top: 0, textStyle: { color: css('--ink-2') }, itemWidth: 12, itemHeight: 8 },
    tooltip: { ...tooltipStyle(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: DAYS.map((d, i) => i === 0 || i === 10 ? d + '*' : d), axisLabel: { color: css('--ink-3') }, axisLine: { lineStyle: { color: css('--rule') } }, axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: css('--ink-3') }, splitLine: { lineStyle: { color: css('--grid') } } },
    series: TYPES.map((t, i) => active.has(t) ? { name: TYPE_KO[t], type: 'bar', stack: 'd', barWidth: '58%', itemStyle: { color: tcol(t) }, data: DATA.daily[i] } : null).filter(Boolean),
  }, true);
  charts.daily.off('click'); charts.daily.on('click', showDay);
}

function renderBlocks() {
  const bw = document.getElementById('bworld');
  bw.innerHTML = BKINDS.map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${k === bkind}">${l}</button>`).join('');
  bw.querySelectorAll('button').forEach(b => b.onclick = () => { bkind = b.dataset.k; renderBlocks(); });
  document.getElementById('bnote').textContent = BNOTE[bkind]; document.getElementById('bnote').style.display = BNOTE[bkind] ? '' : 'none';
  document.getElementById('btypes').innerHTML = TYPES.filter(t => active.has(t)).map(t => {
    const b = btopOf(t); const max = b.top.length ? b.top[0][1] : 1;
    return `<div class="bcol"><h3><i class="sw" style="background:${tcol(t)}"></i>${TYPE_KO[t]}</h3>
      <div class="meta">${fmtFull(b.total)}개 · 블록을 놓은 사람 ${b.placers}명 · 평균 ${b.distinct}종</div>
      ${b.top.length ? b.top.map(([bid, c]) => { const B = DATA.blocks[bid] || { name: bid }; return `<div class="brow clickable" data-t="${t}" data-b="${bid}" title="${B.name}: ${fmtFull(c)}개 · 눌러서 표 보기">${B.img ? `<img src="${B.img}" alt="">` : '<span class="noimg"></span>'}<span class="bn">${B.name}</span><span class="bar" style="width:${100 * c / max}%;background:${tcol(t)}"></span><span class="num">${(100 * c / b.total).toFixed(1)}%</span></div>`; }).join('') : '<div class="meta">놓은 블록 없음</div>'}
    </div>`;
  }).join('');
  document.querySelectorAll('#btypes .brow.clickable').forEach(el => el.onclick = () => showBlock(el.dataset.t, el.dataset.b));
}

function renderQuests() {
  document.getElementById('qcards').innerHTML = TYPES.filter(t => active.has(t)).map(t => {
    const g = DATA.players.filter(p => p.type === t && p.questActive); const done = g.filter(p => p.quests > 0);
    const avg = done.length ? Math.round(done.reduce((s, p) => s + p.quests, 0) / done.length) : 0;
    return `<div class="qcard clickable" data-t="${t}" style="border-color:${tcol(t)}"><div class="n">${TYPE_KO[t]}</div><div class="v">${g.length ? Math.round(100 * done.length / g.length) : 0}%</div><div class="n">${done.length} / ${g.length}명 · 평균 ${avg}개</div></div>`;
  }).join('');
  document.querySelectorAll('#qcards .qcard').forEach(el => el.onclick = () => showQuestType(el.dataset.t));
  charts.qmix = charts.qmix || echarts.init(document.getElementById('qmix'));
  const ts = TYPES.filter(t => active.has(t) && Object.keys(DATA.qgt[t] || {}).length);
  const groups = DATA.groups.filter(g => ts.some(t => (DATA.qgt[t] || {})[g]));
  const tot = Object.fromEntries(ts.map(t => [t, Object.values(DATA.qgt[t]).reduce((s, v) => s + v, 0)]));
  const pal = [css('--seq-4'), css('--seq-3'), css('--seq-2'), css('--seq-1'), css('--t-builder'), css('--t-explorer'), css('--k-dungeon'), css('--t-fighter'), css('--ink-3')];
  charts.qmix.setOption({
    animation: false, textStyle: baseText(),
    grid: { left: 96, right: 16, top: 56, bottom: 24 },
    legend: { top: 0, textStyle: { color: css('--ink-2'), fontSize: 11 }, itemWidth: 10, itemHeight: 8, formatter: n => GROUP_KO[n] || n },
    tooltip: { ...tooltipStyle(), trigger: 'item', formatter: p => `${TYPE_KO[p.name]} · ${GROUP_KO[p.seriesName]}<br>${Math.round(p.value)}% (${fmtFull(DATA.qgt[p.name][p.seriesName] || 0)}개)` },
    xAxis: { type: 'value', max: 100, axisLabel: { color: css('--ink-3'), formatter: '{value}%' }, splitLine: { lineStyle: { color: css('--grid') } } },
    yAxis: { type: 'category', data: ts, axisLabel: { color: css('--ink-2'), formatter: t => TYPE_KO[t] }, axisTick: { show: false }, axisLine: { lineStyle: { color: css('--rule') } } },
    series: groups.map((g, i) => ({ name: g, type: 'bar', stack: 'q', barWidth: 18, itemStyle: { color: pal[i % pal.length] }, data: ts.map(t => 100 * ((DATA.qgt[t] || {})[g] || 0) / tot[t]) })),
  }, true);
  charts.qmix.off('click'); charts.qmix.on('click', p => showQuestGroup(p.name, p.seriesName));
}

// ---------- map (canvas) ----------
const mapPick = document.getElementById('mapPick');
mapPick.innerHTML = DATA.mapOrder.map(w => { const m = DATA.maps[w]; return `<option value="${w}">${m.name} · ${m.players}명 · ${fmtFull(m.minutes)}분</option>`; }).join('');
mapPick.value = DATA.mapOrder[1] || DATA.mapOrder[0];
const slider = document.getElementById('daySlider');
document.getElementById('mapTable').onclick = showMapBlocks;
mapPick.onchange = renderMap; slider.oninput = renderMap;
function renderMap() {
  const m = DATA.maps[mapPick.value]; const day = +slider.value;
  document.getElementById('dayLabel').textContent = DAYS[day];
  const cv = document.getElementById('map'); const r = cv.getBoundingClientRect(); const dpr = devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
  const cells = m.cells.filter(c => active.has(c[0]));
  const agg = new Map(); cells.forEach(([, gx, gz, c]) => { const k = gx + ',' + gz; agg.set(k, (agg.get(k) || 0) + c); });
  const blocks = m.blocks.filter(b => active.has(b[3]) && b[4] <= day);
  // Frame the view on where blocks were built; fall back to the busiest movement cells when few blocks exist.
  let xs = [], zs = [];
  if (blocks.length >= 50) blocks.forEach(b => { xs.push(b[0]); zs.push(b[1]); });
  else agg.forEach((c, k) => { const [gx, gz] = k.split(',').map(Number); const n = Math.min(20, Math.ceil(Math.log1p(c))); for (let i = 0; i < n; i++) { xs.push(gx * 4); zs.push(gz * 4); } });
  if (!xs.length) blocks.forEach(b => { xs.push(b[0]); zs.push(b[1]); });
  if (!xs.length) { document.getElementById('mapInfo').textContent = '선택한 유형의 기록이 없습니다.'; return; }
  xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
  const q = (a, p) => a[Math.floor(p * (a.length - 1))];
  const px = Math.max(16, (q(xs, .99) - q(xs, .01)) * .25), pz = Math.max(16, (q(zs, .99) - q(zs, .01)) * .25);
  const x0 = q(xs, .01) - px, x1 = q(xs, .99) + px, z0 = q(zs, .01) - pz, z1 = q(zs, .99) + pz;
  const s = Math.min(r.width / (x1 - x0), r.height / (z1 - z0));
  const ox = (r.width - s * (x1 - x0)) / 2, oz = (r.height - s * (z1 - z0)) / 2;
  const X = x => ox + (x - x0) * s, Z = z => oz + (z - z0) * s;
  const maxC = Math.log1p(Math.max(1, ...agg.values()));
  const h0 = css('--heat-1'), h2 = css('--heat-2');
  agg.forEach((c, k) => { const [gx, gz] = k.split(',').map(Number); const t = Math.log1p(c) / maxC; ctx.globalAlpha = .3 + .7 * t; ctx.fillStyle = t > .5 ? h2 : h0; ctx.fillRect(X(gx * 4), Z(gz * 4), Math.max(1, 4 * s), Math.max(1, 4 * s)); });
  ctx.globalAlpha = 1;
  const bs = Math.max(1.5, s);
  blocks.forEach(b => { ctx.fillStyle = (DATA.blocks[b[2]] || {}).col || tcol(b[3]); ctx.fillRect(X(b[0]), Z(b[1]), bs, bs); });
  document.getElementById('mapInfo').textContent = `다닌 칸 ${fmtFull(agg.size)}개 · 놓인 블록 ${fmtFull(blocks.length)}개 (${DAYS[day]}까지)`;
}


// ---------- data panel (bottom sheet, Excel-style table of the clicked item) ----------
const KO_TYPE = Object.fromEntries(Object.entries(TYPE_KO).map(([k, v]) => [v, k]));
const KO_KIND = Object.fromEntries(Object.entries(KIND_KO).map(([k, v]) => [v, k]));
const num = (k, l, f) => ({ k, l, num: true, f });
const PCOLS = [
  { k: 'id', l: '플레이어', link: true }, { k: 'typeKo', l: '유형' }, num('minutes', '플레이 시간(분)'), num('days', '접속 일수'), num('zones', '다닌 구역'),
  num('placed', '놓은 블록'), num('dug', '캔 블록'), num('attacks', '공격'), num('kills', '처치'), num('crafts', '제작'), num('deaths', '사망'), num('quests', '완료 퀘스트'),
  num('hub', '허브(분)'), num('personal', '개인 월드(분)'), num('dungeon', '던전(분)'),
];
const prow = p => ({ ...p, typeKo: TYPE_KO[p.type], hub: p.kinds.Hub || 0, personal: p.kinds['Personal world'] || 0, dungeon: p.kinds.Dungeon || 0 });
const dp = { cols: [], rows: [], total: false, sortK: null, dir: -1 };
const dpanel = document.getElementById('dpanel');
function openData({ title, sub, sheet, cols, rows, total = false, sortK = null, sum = '', hl = [], hlRow = null, hlNote = '' }) {
  Object.assign(dp, { cols, rows, total, sortK, dir: -1, hl: new Set(hl), hlRow });
  document.getElementById('dtitle').innerHTML = (sheet ? `<span class="sheet">엑셀 · ${sheet}</span>` : '') + title;
  document.getElementById('dsub').textContent = sub || '';
  document.getElementById('dsum').innerHTML = (sum || `${fmtFull(rows.length)}줄 · 머리글을 누르면 정렬`) + (hl.length || hlRow ? `<i class="hlkey"></i>파란색 = 차트에서 누른 부분${hlNote ? ' · ' + hlNote : ''}` : '');
  drawTable();
  dpanel.classList.add('open'); dpanel.setAttribute('aria-hidden', 'false'); document.body.classList.add('dopen');
  dpanel.querySelector('.dbody').scrollTop = 0;
}
function closeData() { dpanel.classList.remove('open'); dpanel.setAttribute('aria-hidden', 'true'); document.body.classList.remove('dopen'); }
document.getElementById('dclose').onclick = closeData;
addEventListener('keydown', e => { if (e.key === 'Escape') closeData(); });
const cell = (c, v) => v == null ? '' : c.f ? c.f(v) : c.num ? (Number.isInteger(v) ? fmtFull(v) : v.toLocaleString('ko-KR', { maximumFractionDigits: 1 })) : v;
function drawTable() {
  const { cols, total } = dp; let rows = [...dp.rows];
  if (dp.sortK) rows.sort((a, b) => { const x = a[dp.sortK], y = b[dp.sortK]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), "ko")) * dp.dir; });
  const head = `<thead><tr><th class="rn"></th>${cols.map(c => `<th class="${c.num ? 'num' : ''} ${dp.hl.has(c.k) ? 'hl' : ''}" data-k="${c.k}">${c.l}<span class="ar">${dp.sortK === c.k ? (dp.dir < 0 ? '▼' : '▲') : ''}</span></th>`).join('')}</tr></thead>`;
  const body = rows.map((r, i) => `<tr class="${dp.hlRow && dp.hlRow(r) ? 'hlrow' : ''}"><td class="rn">${i + 1}</td>${cols.map(c => `<td class="${c.num ? 'num' : ''} ${dp.hl.has(c.k) ? 'hl' : ''}">${c.link && byId[r[c.k]] ? `<a data-p="${r[c.k]}">${r[c.k]}</a>` : c.tlink && KO_TYPE[r[c.k]] ? `<a data-t="${KO_TYPE[r[c.k]]}" title="이 유형의 플레이어 목록 보기">${r[c.k]} ›</a>` : cell(c, r[c.k])}</td>`).join('')}</tr>`).join('');
  let foot = '';
  if (total && rows.length > 1) foot = `<tr class="total"><td class="rn"></td>${cols.map((c, j) => `<td class="${c.num ? 'num' : ''} ${dp.hl.has(c.k) ? 'hl' : ''}">${j === 0 ? '합계' : c.num && !c.noSum ? cell(c, rows.reduce((s, r) => s + (r[c.k] || 0), 0)) : ''}</td>`).join('')}</tr>`;
  const t = document.getElementById('dtable'); t.innerHTML = head + '<tbody>' + body + foot + '</tbody>';
  t.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k; dp.dir = dp.sortK === k ? -dp.dir : -1; dp.sortK = k; drawTable(); });
  t.querySelectorAll('a[data-t]').forEach(a => a.onclick = () => showTypePlayers(a.dataset.t));
  t.querySelectorAll('a[data-p]').forEach(a => a.onclick = () => { selected = a.dataset.p; if (!active.has(byId[selected].type)) active.add(byId[selected].type); renderAll(); document.getElementById('pcard').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
}
const pct = v => (100 * v).toFixed(1) + '%';
function showPlayers(title, sub, list, extra = [], sortK = 'minutes', hl = [], hlRow = null, hlNote = '') {
  openData({ title, sub, sheet: '플레이어', cols: [...PCOLS.slice(0, 2), ...extra, ...PCOLS.slice(2)], rows: list.map(p => ({ ...prow(p), ...(p._x || {}) })), total: true, sortK, hl, hlRow, hlNote });
}
function showTypePlayers(t) {
  const list = DATA.players.filter(p => p.type === t);
  showPlayers(`${TYPE_KO[t]} 플레이어 목록`, `유형별 요약에서 ${TYPE_KO[t]}를 눌렀습니다. 이 유형 ${list.length}명 전체입니다. 플레이어 ID를 누르면 그 사람의 카드가 열립니다.`, list, [], 'minutes', [], null, '');
  const d = document.getElementById('dtitle');
  d.insertAdjacentHTML('beforeend', ' <button class="dback" type="button">← 유형별 요약</button>');
  d.querySelector('.dback').onclick = () => showTypeSummary();
}
function showTypeSummary(hk) {
  const rows = TYPES.filter(t => active.has(t)).map(t => {
    const g = DATA.players.filter(p => p.type === t), n = g.length, qa = g.filter(p => p.questActive);
    const s = k => g.reduce((a, p) => a + p[k], 0);
    return { t: TYPE_KO[t], n, minutes: s('minutes'), avgMin: s('minutes') / n, placed: s('placed'), attacks: s('attacks'), quests: s('quests'), dungeon: g.reduce((a, p) => a + (p.kinds.Dungeon || 0), 0), qrate: qa.length ? qa.filter(p => p.quests > 0).length / qa.length : 0 };
  });
  openData({ title: '유형별 요약', sub: '선택한 유형만 보입니다. 1인 평균 플레이 시간과 퀘스트 완료율(10/15 이후 접속자 기준)을 함께 봅니다.', sheet: '유형 요약',
    cols: [{ k: 't', l: '유형 (누르면 플레이어 목록)', tlink: true }, num('n', '인원'), num('minutes', '플레이 시간 합계(분)'), { ...num('avgMin', '1인 평균(분)'), noSum: true }, num('placed', '놓은 블록'), num('dungeon', '던전(분)'), num('attacks', '공격'), num('quests', '완료 퀘스트'), { ...num('qrate', '퀘스트 완료율', pct), noSum: true }],
    rows, total: true, hl: hk ? [hk] : [], hlNote: hk ? '합계 = 누른 카드의 숫자' : '' });
}
function showSankey(p) {
  if (p.dataType === 'edge') {
    const t = KO_TYPE[p.data.source], k = KO_KIND[p.data.target];
    const list = DATA.players.filter(x => x.type === t && (x.kinds[k] || 0) > 0).map(x => ({ ...x, _x: { inKind: x.kinds[k], share: x.kinds[k] / x.minutes } }));
    showPlayers(`${p.data.source} → ${p.data.target}`, `${p.data.source} 중 ${p.data.target}에서 시간을 보낸 사람. 이 띠의 굵기 ${fmtFull(p.data.value)}분은 아래 "${p.data.target}(분)" 합계와 같습니다.`, list,
      [num('inKind', p.data.target + '(분)'), { ...num('share', '내 시간 중 비율', pct), noSum: true }], 'inKind', ['inKind'], null, `합계 ${fmtFull(p.data.value)}분 = 띠 굵기`);
  } else if (KO_TYPE[p.name]) {
    const t = KO_TYPE[p.name];
    showPlayers(`${p.name} 전체`, `${p.name}로 분류된 모든 플레이어와 월드 종류별 시간입니다.`, DATA.players.filter(x => x.type === t), [], 'minutes', ['minutes', 'hub', 'personal', 'dungeon'], null, '노드 높이 = 플레이 시간 합계');
  } else {
    const k = KO_KIND[p.name];
    const rows = TYPES.filter(t => active.has(t)).map(t => { const g = DATA.players.filter(x => x.type === t); const m = g.reduce((s, x) => s + (x.kinds[k] || 0), 0); return { t: TYPE_KO[t], m, n: g.filter(x => (x.kinds[k] || 0) > 0).length, all: g.length }; });
    const tot = rows.reduce((s, r) => s + r.m, 0); rows.forEach(r => r.share = tot ? r.m / tot : 0);
    openData({ title: `${p.name}: 유형별 시간`, sub: `${p.name}에서 보낸 시간을 유형별로 나눈 표입니다. 띠를 누르면 사람별로 볼 수 있습니다.`, sheet: '유형×월드',
      cols: [{ k: 't', l: '유형' }, num('m', '플레이 시간(분)'), { ...num('share', '비율', pct), noSum: true }, num('n', '방문한 사람'), num('all', '유형 전체 인원')], rows, total: true, hl: ['m', 'share'], hlNote: `합계 = ${p.name} 노드 높이` });
  }
}
function showDay(p) {
  const t = KO_TYPE[p.seriesName], d = p.dataIndex, dr = (DATA.dayRows || [])[d];
  const list = DATA.players.filter(x => x.type === t && (x.dl || []).includes(d));
  showPlayers(`${DAYS[d]} · ${p.seriesName} ${list.length}명`, `${DAYS[d]}에 접속한 ${p.seriesName}입니다. 아래 숫자는 10일 전체 기록입니다.` + (dr ? ` 이날 로그 ${fmtFull(dr[1])}줄, 중복 ${fmtFull(dr[2])}줄 제거.` : ''), list, [], 'minutes', ['id'], () => true, `${list.length}명 = 막대 높이`);
}
function showBlock(t, bid) {
  const B = DATA.blocks[bid] || { name: bid }; const lst = (bpOf(t) || {})[bid] || []; const wl = bkind === 'All' ? '' : ` · ${BKINDS.find(x => x[0] === bkind)[1]}`; const tot = lst.reduce((s, [, c]) => s + c, 0);
  openData({ title: `${TYPE_KO[t]}${wl} · ${B.name}`, sub: `${TYPE_KO[t]} 중${wl ? ' ' + wl.slice(3) + '에서' : ''} 이 블록(ID ${bid})을 손으로 놓은 사람과 개수입니다.`, sheet: '블록 Top10',
    cols: [{ k: 'id', l: '플레이어', link: true }, num('c', '놓은 수'), { ...num('share', '이 블록 중 비율', pct), noSum: true }, num('placed', '그 사람이 놓은 블록 전체'), num('minutes', '플레이 시간(분)')],
    rows: lst.map(([id, c]) => ({ id, c, share: c / tot, placed: byId[id].placed, minutes: byId[id].minutes })), total: true, sortK: 'c', hl: ['c'], hlNote: `합계 ${fmtFull(tot)}개 = 막대 길이` });
}
function showQuestType(t) {
  const list = DATA.players.filter(x => x.type === t && x.questActive).map(x => ({ ...x, _x: { done: x.quests > 0 ? '완료' : '-' } }));
  showPlayers(`${TYPE_KO[t]} · 퀘스트`, `10/15 18:06 이후 접속한 ${TYPE_KO[t]}입니다. "완료 퀘스트"가 1 이상인 사람이 완료율의 분자입니다.`, list, [{ k: 'done', l: '1개 이상 완료' }], 'quests', ['done', 'quests'], r => r.quests > 0, `파란 줄 ${list.filter(x => x.quests > 0).length}명 ÷ 전체 ${list.length}명 = 카드의 %`);
}
function showQuestGroup(t, g) {
  const list = DATA.players.filter(x => x.type === t && (x.qg[g] || 0) > 0).map(x => ({ ...x, _x: { g: x.qg[g] } }));
  showPlayers(`${TYPE_KO[t]} · ${GROUP_KO[g] || g} 퀘스트`, `이 묶음의 퀘스트를 완료한 ${TYPE_KO[t]}입니다.`, list, [num('g', (GROUP_KO[g] || g) + ' 완료')], 'g', ['g'], null, '합계 = 막대 조각');
}
function showMapBlocks() {
  const m = DATA.maps[mapPick.value]; const day = +slider.value; const c = new Map();
  m.blocks.filter(b => active.has(b[3]) && b[4] <= day).forEach(b => { const r = c.get(b[2]) || { name: (DATA.blocks[b[2]] || {}).name || b[2], id: b[2], all: 0, Builder: 0, Fighter: 0, Explorer: 0, 'Short visit': 0 }; r.all++; r[b[3]]++; c.set(b[2], r); });
  openData({ title: `${m.name} · 놓인 블록`, sub: `${DAYS[day]}까지 이 월드에 손으로 놓인 블록을 종류와 유형별로 셌습니다.`, sheet: '월드',
    cols: [{ k: 'name', l: '블록' }, num('id', 'ID', v => v), num('all', '합계'), ...TYPES.filter(t => active.has(t)).map(t => num(t, TYPE_KO[t]))], rows: [...c.values()], total: true, sortK: 'all', hl: ['all'], hlNote: '지도 위 색 점의 개수' });
}

function renderAll() { renderFilters(); renderKPIs(); renderRanks(); renderScatter(); renderCard(); renderSankey(); renderDaily(); renderBlocks(); renderQuests(); renderMap(); }
renderAll();
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { Object.values(charts).forEach(c => c.resize()); renderMap(); }, 120); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderAll);
new MutationObserver(renderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
