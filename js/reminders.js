// ============================================================
//  js/reminders.js  —  Smart Reminder Rendering
// ============================================================

import { esc } from './tasks.js';

// ── Render the reminders list ─────────────────────────────────
export function renderReminders(tasks) {
  const el = document.getElementById('reminder-list');
  if (!el) return;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const pending = tasks
    .filter(t => !t.done)
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  if (!pending.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎊</div>
        <p>All done! No pending tasks. Enjoy your free time!</p>
      </div>`;
    return;
  }

  el.innerHTML = pending.map(t => {
    const due  = new Date(t.due);
    const diff = Math.ceil((due - now) / 86400000);
    let badge, icon;

    if (diff < 0) {
      icon  = '🚨';
      badge = `<span class="reminder-badge urgent">🔴 ${Math.abs(diff)}d overdue</span>`;
    } else if (diff === 0) {
      icon  = '⚡';
      badge = `<span class="reminder-badge urgent">🔴 Due today!</span>`;
    } else if (diff <= 2) {
      icon  = '⏰';
      badge = `<span class="reminder-badge soon">🟡 Due in ${diff} day${diff > 1 ? 's' : ''}</span>`;
    } else if (diff <= 7) {
      icon  = '📅';
      badge = `<span class="reminder-badge upcoming">🔵 ${diff} days left</span>`;
    } else {
      icon  = '📌';
      badge = `<span class="reminder-badge upcoming">🔵 ${diff} days left</span>`;
    }

    const dueStr = due.toLocaleDateString('en-PH', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    return `
      <div class="reminder-card">
        <div class="reminder-icon">${icon}</div>
        <div class="reminder-info">
          <div class="reminder-title">${esc(t.title)}</div>
          <div class="reminder-time">
            ${esc(t.subject)} &middot; Due ${dueStr}
            &middot; <span class="priority-badge ${t.priority}" style="font-size:10px">${t.priority}</span>
          </div>
        </div>
        ${badge}
      </div>`;
  }).join('');
}

// ── Show browser notification (call once on load) ─────────────
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function checkDueSoon(tasks) {
  if (Notification.permission !== 'granted') return;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  tasks.filter(t => !t.done).forEach(t => {
    const diff = Math.ceil((new Date(t.due) - now) / 86400000);
    if (diff === 1) {
      new Notification('⏰ StudyMate Reminder', {
        body: `"${t.title}" is due tomorrow!`,
        icon: '/favicon.ico'
      });
    }
  });
}