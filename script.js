(() => {
  // ---------- Constants ----------
  const STATUS = ['open', 'progress', 'solved', 'overdue'];
  const NAME = { open: 'Open', progress: 'In progress', solved: 'Solved', overdue: 'Overdue' };
  const COL = { open: '#2563EB', progress: '#D97706', solved: '#16A34A', overdue: '#DC2626' };
  const DOT = { all: '#A7F3D0', open: '#7DD3FC', progress: '#FCD34D', solved: '#86EFAC', overdue: '#FCA5A5' };
  const GRAD = { all: ['#044B48', '#0E7490'], open: ['#0A5A75', '#0E7490'], progress: ['#0B5E52', '#0D7A5F'], solved: ['#0F5A2E', '#0F766E'], overdue: ['#0B4F4B', '#0A6E6A'] };
  const ICON = {
    all: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z',
    open: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
    progress: 'M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    solved: 'M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    overdue: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'
  };
  const CATS = ['Technical', 'Settlement', 'Operations', 'Financial Issues', 'Sales Support'];
  const CAT_COL = ['#4338CA', '#0E7490', '#BE185D', '#A16207', '#7E22CE'];
  const USERS = ['Amina Rahman', 'Daniel Ortiz', 'Priya Nair', 'Lucas Meyer'];
  const USER_COL = ['#4338CA', '#0E7490', '#BE185D', '#7E22CE'];
  const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  const SLA_DAYS = { low: 5, medium: 3, high: 2, urgent: 1 };
  const CIRC = 339.29;

  // ---------- Dates (always the current month) ----------
  const now = new Date();
  const T = now.getDate();
  const DIM = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const FIRST = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const mon = now.toLocaleString('en', { month: 'short' });

  const state = { status: 'all', priority: 'all', assignee: 'all', range: 'month' };
  const content = document.getElementById('content');
  let tickets = [];
  let settled = false;

  // ---------- Mock data ----------
  // Replace this function with a real API call. Each ticket needs:
  // c = day created, r = day resolved (or null), a = assignee, p = priority, cat = category, s = status
  function buildTickets() {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const out = [];
    for (let i = 0; i < 60; i++) {
      const p = PRIORITIES[Math.floor(rnd() * 4)];
      const raw = rnd() < 0.45 ? 'solved' : (rnd() < 0.5 ? 'open' : 'progress');
      const c = raw === 'solved' ? 1 + Math.floor(rnd() * T) : Math.max(1, T - Math.floor(rnd() * 6));
      const r = raw === 'solved' ? Math.min(T, c + Math.floor(rnd() * 3)) : null;
      // Overdue = unresolved and past its priority's due time
      const s = raw === 'solved' ? 'solved' : (c + SLA_DAYS[p] < T ? 'overdue' : raw);
      out.push({ i, cat: CATS[Math.floor(rnd() * CATS.length)], a: USERS[Math.floor(rnd() * 4)], p, s, c, r });
    }
    return out;
  }

  // ---------- Helpers ----------
  const pct = (n, t) => (t ? Math.round(n / t * 100) : 0);
  const svgIcon = d => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;

  function arcs(parts, baseDelay) {
    const live = parts.filter(p => p.v > 0);
    const sum = live.reduce((a, p) => a + p.v, 0);
    let acc = 0;
    return live.map((p, i) => {
      const len = p.v / sum * CIRC, gap = live.length > 1 ? 3 : 0;
      const html = `<circle class="arc" cx="70" cy="70" r="54" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${CIRC}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 70 70)" style="animation-delay:${baseDelay + i * 150}ms"></circle>`;
      acc += len;
      return html;
    }).join('');
  }
  const ring = (parts, base, big, small, aria) =>
    `<div class="ring" role="img" aria-label="${aria}"><svg viewBox="0 0 140 140" width="100%" height="100%" aria-hidden="true"><circle cx="70" cy="70" r="54" fill="none" stroke="#E2E8F0" stroke-width="16"></circle>${arcs(parts, base)}</svg><div class="mid"><b>${big}</b><span>${small}</span></div></div>`;

  // ---------- Sections ----------
  function kpiCards(base) {
    const tot = base.length, cnt = k => base.filter(x => x.s === k).length;
    return '<div class="row">' + ['all', ...STATUS].map((k, i) => {
      const n = k === 'all' ? tot : cnt(k), warn = k === 'overdue' && n > 0, on = state.status === k;
      const note = k === 'all' ? 'Created ' + (state.range === 'week' ? 'in the last 7 days' : 'this month') : pct(n, tot) + '% of tickets' + (warn ? ' · needs attention' : '');
      return `<button class="kpi rise${warn ? ' warn' : ''}" data-status="${k}" aria-pressed="${on}" style="background:linear-gradient(135deg,${GRAD[k][0]},${GRAD[k][1]});animation-delay:${i * 70}ms">
        <span class="top"><span class="lbl"><span class="dotc" style="background:${DOT[k]}"></span>${k === 'all' ? 'Total tickets' : NAME[k]}</span><span class="ico">${svgIcon(ICON[k])}</span></span>
        <span class="n">${n}</span>
        <span class="note"><span>${note}</span>${on ? '<span class="pill">Showing</span>' : ''}</span></button>`;
    }).join('') + '</div>';
  }

  function summary(f, lo) {
    const created = f.length, resolved = f.filter(x => x.r).length, back = created - resolved;
    const ratio = pct(resolved, created), grew = back > 0;
    const tiles = [
      ['Created', created, 'tickets in period', '#DBEAFE', '#1D4ED8'],
      ['Resolved', resolved, 'tickets solved', '#DCFCE7', '#166534'],
      ['Backlog change', (grew ? '+' : '') + back, grew ? 'Backlog grew ↑' : 'No backlog growth', grew ? '#FEF3C7' : '#DCFCE7', grew ? '#92400E' : '#166534'],
      ['Resolution ratio', ratio + '%', 'of created, resolved', '#E2E8F0', '#0F172A']
    ].map((t, i) => `<div class="tile rise" style="background:${t[3]};animation-delay:${300 + i * 90}ms"><b>${t[0]}</b><strong style="color:${t[4]}">${t[1]}</strong><span>${t[2]}</span></div>`).join('');
    const legend = items => '<div class="legend">' + items.map(g => `<span style="display:flex;align-items:center;gap:6px"><span class="sw" style="background:${g[1]}"></span>${g[0]} <strong>${g[2]}</strong></span>`).join('') + '</div>';
    const d1 = [{ v: created, color: '#2563EB' }, { v: resolved, color: '#15803D' }];
    const d2 = [{ v: resolved, color: '#15803D' }, { v: back, color: '#94A3B8' }];
    const period = mon + ' ' + lo + (lo < T ? '–' + T : '');
    return `<div class="card rise" style="animation-delay:200ms">
      <div class="head"><h2>Period summary</h2><span class="muted">${period}</span></div>
      <div class="sum"><div class="tiles">${tiles}</div><div class="donuts">
        <figure class="rise" style="animation-delay:350ms">${ring(d1, 450, created, 'created', created + ' created and ' + resolved + ' resolved')}<figcaption>Created vs resolved</figcaption>${legend([['Created', '#2563EB', created], ['Resolved', '#15803D', resolved]])}</figure>
        <figure class="rise" style="animation-delay:450ms">${ring(d2, 600, ratio + '%', 'resolved', ratio + ' percent of created tickets resolved')}<figcaption>Resolution ratio</figcaption>${legend([['Resolved', '#15803D', resolved], ['Unresolved', '#94A3B8', back]])}</figure>
      </div></div></div>`;
  }

  function trend(f, lo) {
    const days = []; for (let i = lo; i <= T; i++) days.push(i);
    const cr = days.map(d => f.filter(x => x.c === d).length), rs = days.map(d => f.filter(x => x.r === d).length);
    const mx = Math.max(4, ...cr, ...rs), n = days.length;
    const X = i => (n > 1 ? 46 + i * (544 / (n - 1)) : 318), Y = v => 190 - v / mx * 170;
    const line = a => a.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const grid = [0, 0.5, 1].map(q => `<line x1="46" x2="590" y1="${Y(q * mx)}" y2="${Y(q * mx)}" stroke="#E2E8F0"></line><text x="38" y="${Y(q * mx) + 4}" text-anchor="end" font-size="11" fill="#475569">${Math.round(q * mx)}</text>`).join('');
    const step = Math.ceil(n / 8);
    const labels = days.map((d, i) => (i % step ? '' : `<text x="${X(i)}" y="218" text-anchor="middle" font-size="11" fill="#475569">${d}</text>`)).join('');
    const pts = days.map((d, i) => { const tip = `${mon} ${d}: ${cr[i]} created, ${rs[i]} resolved`; return `<circle class="dot" cx="${X(i)}" cy="${Y(cr[i])}" r="4" fill="#2563EB"><title>${tip}</title></circle><circle class="dot" cx="${X(i)}" cy="${Y(rs[i])}" r="4" fill="#15803D"><title>${tip}</title></circle>`; }).join('');
    return `<div class="card g2">
      <div class="head"><h2>Created vs resolved</h2><div class="key">
        <span><svg width="22" height="8" aria-hidden="true"><path d="M0 4H22" stroke="#2563EB" stroke-width="3"></path></svg>Created</span>
        <span><svg width="22" height="8" aria-hidden="true"><path d="M0 4H22" stroke="#15803D" stroke-width="3" stroke-dasharray="5 3"></path></svg>Resolved</span></div></div>
      <svg viewBox="0 0 600 230" style="width:100%;height:auto;display:block" role="img" aria-label="Line chart of tickets created and resolved per day">
        ${grid}${labels}
        <defs><clipPath id="trendclip"><rect class="wipe" x="0" y="0" width="600" height="230"></rect></clipPath></defs>
        <g clip-path="url(#trendclip)"><path d="${line(cr)}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linejoin="round"></path><path d="${line(rs)}" fill="none" stroke="#15803D" stroke-width="2.5" stroke-dasharray="6 4" stroke-linejoin="round"></path>${pts}</g>
      </svg>
      <p class="muted" style="margin:0;text-align:center;font-size:12px">Day of month</p></div>`;
  }

  function statusCard(base) {
    const tot = base.length, parts = STATUS.map(k => ({ k, v: base.filter(x => x.s === k).length }));
    const legend = parts.map((p, i) => `<li class="rise" style="animation-delay:${400 + i * 90}ms"><span class="sw" style="background:${COL[p.k]}"></span>${NAME[p.k]} <strong>${p.v}</strong> <span class="muted" style="font-size:14px">(${pct(p.v, tot)}%)</span></li>`).join('');
    return `<div class="card g1"><h2 style="margin-bottom:16px">Tickets by status</h2><div class="status-wrap">
      ${ring(parts.map(p => ({ v: p.v, color: COL[p.k] })), 300, tot, 'tickets', 'Donut chart of ticket status distribution')}
      <ul class="legend">${legend}</ul></div></div>`;
  }

  function calendar(f) {
    const cells = [];
    for (let i = 0; i < FIRST; i++) cells.push('<div class="day blank"></div>');
    for (let d = 1; d <= DIM; d++) {
      const ts = f.filter(x => x.c === d);
      const chips = STATUS.map(k => [k, ts.filter(x => x.s === k).length]).filter(c => c[1])
        .map(c => `<span class="chip s-${c[0]}" title="${c[1]} ${NAME[c[0]]}" aria-label="${c[1]} ${NAME[c[0]]}">${c[1]}</span>`).join('');
      cells.push(`<div class="day${d === T ? ' today' : ''}${d > T ? ' future' : ''}"><span class="d">${d}</span><div class="chips">${chips}</div></div>`);
    }
    const key = STATUS.map(k => `<span style="display:flex;align-items:center;gap:6px"><span class="sw s-${k}" style="border:1px solid currentColor"></span>${NAME[k]}</span>`).join('');
    return `<div class="card g2"><div class="head"><h2>${now.toLocaleString('en', { month: 'long', year: 'numeric' })}</h2><span class="muted">Tickets created per day, by status</span></div>
      <div class="cal">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => `<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>
      <div class="calkey">${key}</div></div>`;
  }

  function categories(f) {
    const cc = CATS.map(c => f.filter(x => x.cat === c).length), mx = Math.max(1, ...cc);
    return `<div class="card g1"><h2 style="margin-bottom:16px">Tickets by category</h2><div class="bars">${CATS.map((c, i) =>
      `<div class="rise" style="animation-delay:${300 + i * 90}ms"><div class="l"><span><span class="sw" style="background:${CAT_COL[i]}"></span>${c}</span><strong>${cc[i]}</strong></div><div class="track"><div class="bar" style="width:${Math.round(cc[i] / mx * 100)}%;background:${CAT_COL[i]};animation-delay:${300 + i * 90}ms"></div></div></div>`).join('')}</div></div>`;
  }

  function solvedByUser(byPA, lo) {
    const list = USERS.map((name, i) => {
      const mine = byPA.filter(x => x.a === name), solved = mine.filter(x => x.r).length;
      return { name, solved, assigned: mine.length, color: USER_COL[i], initials: name.split(' ').map(w => w[0]).join('') };
    }).sort((a, b) => b.solved - a.solved);
    const mx = Math.max(1, ...list.map(u => u.solved)), total = list.reduce((a, u) => a + u.solved, 0);
    const period = mon + ' ' + lo + (lo < T ? '–' + T : '');
    return `<div class="card rise" style="animation-delay:150ms"><div class="head"><h2>Tickets solved by user</h2><span class="muted">${period} · ${total} solved</span></div><div class="users">${list.map((u, i) =>
      `<div class="user rise" style="animation-delay:${300 + i * 90}ms"><span class="av" aria-hidden="true" style="background:${u.color}">${u.initials}</span><div><div class="l"><span style="font-weight:600">${i + 1}. ${u.name}</span><span><strong>${u.solved}</strong> solved <span class="muted" style="font-size:14px">· ${pct(u.solved, u.assigned)}% of ${u.assigned} assigned</span></span></div><div class="track"><div class="bar" style="width:${Math.round(u.solved / mx * 100)}%;background:${u.color};animation-delay:${300 + i * 90}ms"></div></div></div></div>`).join('')}</div></div>`;
  }

  // ---------- Render ----------
  function render() {
    const lo = state.range === 'week' ? Math.max(1, T - 6) : 1;
    const byPA = tickets.filter(x => x.c >= lo && (state.priority === 'all' || x.p === state.priority));
    const base = byPA.filter(x => state.assignee === 'all' || x.a === state.assignee);
    const f = base.filter(x => state.status === 'all' || x.s === state.status);
    let html = kpiCards(base);
    if (!f.length) {
      html += `<div class="card center"><h2>No tickets match these filters</h2><p>Try a different status, priority, assignee or date range.</p><button class="btn" data-action="clear">Clear all filters</button></div>`;
    } else {
      html += summary(f, lo) + `<div class="row">${trend(f, lo)}${statusCard(base)}</div><div class="row">${calendar(f)}${categories(f)}</div>` + solvedByUser(byPA, lo);
    }
    content.classList.toggle('settled', settled);
    content.innerHTML = html;
    content.setAttribute('aria-busy', 'false');
    settled = true; // animate only on the first paint, not on every filter change
  }

  function showError() {
    content.innerHTML = `<div class="card center" role="alert" style="border-color:#FCA5A5"><h2 style="color:#B91C1C">We couldn’t load ticket data</h2><p>Check your connection and try again. Your filters have been kept.</p><button class="btn" data-action="retry">Try again</button></div>`;
    content.setAttribute('aria-busy', 'false');
  }

  function load() {
    try { if (!tickets.length) tickets = buildTickets(); render(); } catch (e) { console.error(e); showError(); }
  }

  // ---------- Events ----------
  const sel = { fStatus: 'status', fPriority: 'priority', fAssignee: 'assignee', fRange: 'range' };
  Object.entries(sel).forEach(([id, key]) => document.getElementById(id).addEventListener('change', e => { state[key] = e.target.value; render(); }));

  content.addEventListener('click', e => {
    const card = e.target.closest('[data-status]');
    if (card) {
      const k = card.dataset.status;
      state.status = state.status === k ? 'all' : k;
      document.getElementById('fStatus').value = state.status;
      render();
      return;
    }
    const act = e.target.closest('[data-action]');
    if (!act) return;
    if (act.dataset.action === 'clear') {
      Object.assign(state, { status: 'all', priority: 'all', assignee: 'all', range: 'month' });
      Object.entries(sel).forEach(([id, key]) => { document.getElementById(id).value = state[key]; });
      render();
    } else if (act.dataset.action === 'retry') {
      settled = false;
      load();
    }
  });

  document.getElementById('monthLabel').textContent = now.toLocaleString('en', { month: 'long', year: 'numeric' }) + ' · ticket activity for this month';
  setTimeout(load, 700); // simulated loading state
})();
