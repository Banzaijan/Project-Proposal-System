// ============================================================
//  js/focus.js  —  Pomodoro Focus Timer
// ============================================================

import { esc } from './tasks.js';

const WORK_MINS  = 25;
const BREAK_MINS = 5;

let interval    = null;
let seconds     = WORK_MINS * 60;
let running     = false;
let isBreak     = false;
let sessionsDone = 0;

// ── Populate task dropdown ────────────────────────────────────
export function populateFocusSelect(tasks) {
  const sel = document.getElementById('focus-task-select');
  if (!sel) return;
  const pending = tasks.filter(t => !t.done);
  sel.innerHTML = '<option value="">— choose a task to focus on —</option>'
    + pending.map(t =>
        `<option value="${esc(t.title)}">${esc(t.title)} (${esc(t.subject)})</option>`
      ).join('');
}

// ── Start ─────────────────────────────────────────────────────
window.focusStart = () => {
  const sel  = document.getElementById('focus-task-select');
  const task = sel ? sel.value : '';
  if (!task && !isBreak) {
    showNotif('⚠️ Please select a task first!', 'error');
    return;
  }
  if (task) {
    document.getElementById('focus-current-task').textContent = task;
  }
  running = true;
  document.getElementById('focus-start-btn').style.display = 'none';
  document.getElementById('focus-pause-btn').style.display = '';

  interval = setInterval(() => {
    if (!running) return;
    seconds--;
    updateTimerDisplay();
    if (seconds <= 0) {
      clearInterval(interval);
      sessionsDone++;
      if (isBreak) {
        isBreak = false;
        seconds = WORK_MINS * 60;
        showNotif('✅ Break over! Ready to focus again?', 'success');
        focusStop(false);
      } else {
        isBreak = true;
        seconds = BREAK_MINS * 60;
        showNotif(`🎉 Session ${sessionsDone} done! Take a 5-min break.`, 'success');
        updateTimerDisplay();
        document.getElementById('focus-current-task').textContent = '☕ Break time!';
        // Auto-start break
        interval = setInterval(() => {
          if (!running) return;
          seconds--;
          updateTimerDisplay();
          if (seconds <= 0) {
            clearInterval(interval);
            isBreak = false;
            seconds = WORK_MINS * 60;
            running = false;
            updateTimerDisplay();
            showNotif('✅ Break done! Start your next session.', 'success');
            document.getElementById('focus-start-btn').style.display = '';
            document.getElementById('focus-pause-btn').style.display = 'none';
          }
        }, 1000);
      }
    }
  }, 1000);
};

// ── Pause / Resume ────────────────────────────────────────────
window.focusPause = () => {
  running = !running;
  const btn = document.getElementById('focus-pause-btn');
  if (btn) btn.textContent = running ? '⏸ Pause' : '▶ Resume';
};

// ── Stop / Reset ──────────────────────────────────────────────
window.focusStop = (resetSession = true) => {
  clearInterval(interval);
  running = false;
  isBreak = false;
  if (resetSession) {
    seconds       = WORK_MINS * 60;
    sessionsDone  = 0;
    const cur = document.getElementById('focus-current-task');
    if (cur) cur.textContent = 'No task selected';
  }
  updateTimerDisplay();
  const startBtn = document.getElementById('focus-start-btn');
  const pauseBtn = document.getElementById('focus-pause-btn');
  if (startBtn) startBtn.style.display = '';
  if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '⏸ Pause'; }
};

// ── Update the timer display ──────────────────────────────────
function updateTimerDisplay() {
  const el = document.getElementById('focus-timer');
  if (el) el.textContent = formatTime(seconds);
  // Update page title
  document.title = running
    ? `${formatTime(seconds)} — ${isBreak ? 'Break' : 'Focus'} | StudyMate`
    : 'Focus Mode | StudyMate';
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Toast notification (local) ────────────────────────────────
function showNotif(msg, type) {
  const n = document.createElement('div');
  n.className = `notif ${type}`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}