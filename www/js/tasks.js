// ============================================================
//  js/tasks.js  —  Task CRUD (Add, Read, Update, Delete)
// ============================================================

import { db } from './firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, onSnapshot, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let tasks = [];
let unsubscribe = null;

// ── Listen to tasks in real-time ──────────────────────────────
export function listenTasks(uid, onUpdate) {
  if (unsubscribe) unsubscribe();
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', uid)
  );
  unsubscribe = onSnapshot(q, (snap) => {
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tasks.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      if (order[a.priority] !== order[b.priority])
        return order[a.priority] - order[b.priority];
      return new Date(a.due) - new Date(b.due);
    });
    onUpdate(tasks);
  });
}

// ── Add a new task ────────────────────────────────────────────
export async function addTask(uid, { title, subject, type, due, priority, notes }) {
  if (!title) throw new Error('Task title is required.');
  await addDoc(collection(db, 'tasks'), {
    uid,
    userId:    uid,
    title:     title.trim(),
    subject:   (subject || '').trim() || 'General',
    type:      type || 'assignment',
    due:       due || '',
    priority:  priority || 'medium',
    notes:     (notes || '').trim(),
    done:      false,
    createdAt: new Date().toISOString()
  });
}

// ── Toggle done/undone ────────────────────────────────────────
export async function toggleTask(id, currentDone) {
  await updateDoc(doc(db, 'tasks', id), { done: !currentDone });
}

// ── Delete a task ─────────────────────────────────────────────
export async function deleteTask(id) {
  await deleteDoc(doc(db, 'tasks', id));
}

// ── Update a task ─────────────────────────────────────────────
export async function updateTask(id, data) {
  await updateDoc(doc(db, 'tasks', id), data);
}

// ── Build task card HTML ──────────────────────────────────────
export function taskCardHTML(t) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = t.due ? new Date(t.due) : null;
  const diff = due ? Math.ceil((due - now) / 86400000) : null;

  let dueClass = '', dueLabel = '';
  if (t.done) {
    dueLabel = 'Completed ✓';
  } else if (diff === null) {
    dueLabel = 'No due date';
  } else if (diff < 0) {
    dueClass = 'overdue';
    dueLabel = `${Math.abs(diff)}d overdue`;
  } else if (diff === 0) {
    dueClass = 'soon';
    dueLabel = 'Due today!';
  } else if (diff <= 2) {
    dueClass = 'soon';
    dueLabel = `Due in ${diff}d`;
  } else {
    dueLabel = `Due ${due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;
  }

  return `
    <div class="task-card ${t.priority} ${t.done ? 'done' : ''}" data-id="${esc(t.id)}">
      <div class="task-check" onclick="handleToggle('${t.id}', ${t.done})">
        ${t.done ? '✓' : ''}
      </div>
      <div class="task-info">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          <span class="task-subject">${esc(t.subject)}</span>
          <span class="task-due ${dueClass}">${dueLabel}</span>
          <span class="priority-badge ${t.priority}">${t.priority}</span>
          ${t.notes ? `<span style="font-size:11px;color:var(--muted)">📝 ${esc(t.notes)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" onclick="handleDelete('${t.id}')" title="Delete">🗑</button>
      </div>
    </div>`;
}

// ── Compute stats from tasks array ────────────────────────────
export function computeStats(tasks) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return {
    total:   tasks.length,
    done:    tasks.filter(t => t.done).length,
    pending: tasks.filter(t => !t.done).length,
    overdue: tasks.filter(t => !t.done && t.due && new Date(t.due) < now).length
  };
}

// ── HTML escape utility ───────────────────────────────────────
export function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}