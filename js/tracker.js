// ============================================================
//  js/tracker.js  —  Productivity Tracker Rendering
// ============================================================

import { computeStats, esc } from './tasks.js';

export function renderTracker(tasks) {
  renderDonut(tasks);
  renderPriorityBars(tasks);
  renderSubjectBars(tasks);
  renderWeeklyGrid(tasks);
}

// ── Donut Chart ───────────────────────────────────────────────
function renderDonut(tasks) {
  const { total, done, pending, overdue } = computeStats(tasks);
  const pct = total ? Math.round(done / total * 100) : 0;
  const circumference = 301.6;
  const circle = document.getElementById('donut-circle');
  if (circle) {
    circle.style.strokeDashoffset = circumference - (pct / 100 * circumference);
  }
  setText('donut-pct',      pct + '%');
  setText('legend-done',    `${done} Completed`);
  setText('legend-pending', `${pending} Pending`);
  setText('legend-overdue', `${overdue} Overdue`);
}

// ── Priority Bars ─────────────────────────────────────────────
function renderPriorityBars(tasks) {
  const el = document.getElementById('priority-bars');
  if (!el) return;
  const total = tasks.length || 1;
  const data = [
    { label: '🔴 High',   key: 'high',   color: '#f87171' },
    { label: '🟡 Medium', key: 'medium', color: '#fbbf24' },
    { label: '🟢 Low',    key: 'low',    color: '#34d399' },
  ];
  el.innerHTML = data.map(({ label, key, color }) => {
    const count = tasks.filter(t => t.priority === key).length;
    const w     = Math.round(count / total * 100);
    return `
      <div class="progress-bar-wrap">
        <div class="progress-bar-label">
          <span>${label}</span><span>${count} tasks</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${w}%; background:${color}"></div>
        </div>
      </div>`;
  }).join('');
}

// ── Subject Bars ──────────────────────────────────────────────
function renderSubjectBars(tasks) {
  const el = document.getElementById('subject-bars');
  if (!el) return;
  const map = {};
  tasks.forEach(t => { map[t.subject] = (map[t.subject] || 0) + 1; });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = entries.length ? entries[0][1] : 1;

  el.innerHTML = entries.length
    ? entries.map(([subject, count]) => `
        <div class="subject-row">
          <div class="subject-name" title="${esc(subject)}">${esc(subject)}</div>
          <div class="subject-bar-track">
            <div class="subject-bar-fill" style="width:${Math.round(count / max * 100)}%"></div>
          </div>
          <div class="subject-count">${count}</div>
        </div>`).join('')
    : '<p style="color:var(--muted);font-size:13px">No tasks yet.</p>';
}

// ── Weekly Grid ───────────────────────────────────────────────
function renderWeeklyGrid(tasks) {
  const el = document.getElementById('weekly-grid');
  if (!el) return;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  tasks.forEach(t => {
    const d   = new Date(t.createdAt);
    const idx = Math.floor((d - startOfWeek) / 86400000);
    if (idx >= 0 && idx < 7) counts[idx]++;
  });

  const max   = Math.max(...counts, 1);
  const today = now.getDay();

  el.innerHTML = days.map((d, i) => `
    <div class="day-col">
      <div class="day-label" style="color:${i === today ? 'var(--accent)' : 'var(--muted)'}">${d}</div>
      <div class="day-bar-wrap">
        <div class="day-bar" style="height:${Math.round(counts[i] / max * 70) + 4}px; opacity:${i === today ? 1 : 0.6}"></div>
      </div>
      <div class="day-count">${counts[i]}</div>
    </div>`).join('');
}

// ── Helper ────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}