# ============================================================
#  server/app.py  —  Optional Python Flask Backend
#  This gives you extra server-side features like:
#  - Task analytics API
#  - CSV export
#  - Backup/restore
#
#  Run:  python app.py
#  URL:  http://localhost:5000
# ============================================================

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, date
import json

app = Flask(__name__)
CORS(app)  # Allow requests from your HTML frontend


# ── Health Check ─────────────────────────────────────────────
@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'StudyMate Python Backend is running!',
        'version': '1.0.0'
    })


# ── Analytics: Compute stats from a list of tasks ────────────
@app.route('/api/analytics', methods=['POST'])
def analytics():
    """
    Accepts a JSON list of tasks from the frontend
    and returns computed analytics.

    Example request body:
    {
      "tasks": [
        { "title": "...", "due": "2026-03-20", "priority": "high", "done": false, ... }
      ]
    }
    """
    data  = request.get_json()
    tasks = data.get('tasks', [])
    today = date.today()

    total   = len(tasks)
    done    = sum(1 for t in tasks if t.get('done'))
    pending = total - done
    overdue = sum(
        1 for t in tasks
        if not t.get('done') and datetime.strptime(t['due'], '%Y-%m-%d').date() < today
    )

    # Tasks by priority
    by_priority = {'high': 0, 'medium': 0, 'low': 0}
    for t in tasks:
        p = t.get('priority', 'medium')
        if p in by_priority:
            by_priority[p] += 1

    # Tasks by subject
    by_subject = {}
    for t in tasks:
        s = t.get('subject', 'General')
        by_subject[s] = by_subject.get(s, 0) + 1

    # Completion rate
    completion_pct = round(done / total * 100, 1) if total else 0

    return jsonify({
        'total':          total,
        'done':           done,
        'pending':        pending,
        'overdue':        overdue,
        'completion_pct': completion_pct,
        'by_priority':    by_priority,
        'by_subject':     by_subject,
    })


# ── Due Soon: Filter tasks due in next N days ─────────────────
@app.route('/api/due-soon', methods=['POST'])
def due_soon():
    """
    Returns tasks due within the next `days` days (default: 3).

    Example request body:
    { "tasks": [...], "days": 3 }
    """
    data  = request.get_json()
    tasks = data.get('tasks', [])
    days  = int(data.get('days', 3))
    today = date.today()

    upcoming = []
    for t in tasks:
        if t.get('done'):
            continue
        try:
            due = datetime.strptime(t['due'], '%Y-%m-%d').date()
            diff = (due - today).days
            if -1 <= diff <= days:
                t['days_until_due'] = diff
                upcoming.append(t)
        except (KeyError, ValueError):
            continue

    upcoming.sort(key=lambda t: t['days_until_due'])
    return jsonify({'tasks': upcoming, 'count': len(upcoming)})


# ── Export: Convert tasks to CSV format ───────────────────────
@app.route('/api/export/csv', methods=['POST'])
def export_csv():
    """
    Converts a list of tasks to CSV text.
    """
    data  = request.get_json()
    tasks = data.get('tasks', [])

    lines = ['Title,Subject,Due Date,Priority,Status,Notes']
    for t in tasks:
        status = 'Done' if t.get('done') else 'Pending'
        line = ','.join([
            f'"{t.get("title",    "")}"',
            f'"{t.get("subject",  "")}"',
            f'"{t.get("due",      "")}"',
            f'"{t.get("priority", "")}"',
            f'"{status}"',
            f'"{t.get("notes",    "")}"',
        ])
        lines.append(line)

    return jsonify({'csv': '\n'.join(lines)})


# ── Priority Score: Rank tasks by urgency ─────────────────────
@app.route('/api/priority-score', methods=['POST'])
def priority_score():
    """
    Computes a numeric urgency score for each task.
    Higher score = more urgent.
    Formula: priority_weight / max(days_left, 0.5)
    """
    data  = request.get_json()
    tasks = data.get('tasks', [])
    today = date.today()

    weight = {'high': 3, 'medium': 2, 'low': 1}
    scored = []

    for t in tasks:
        if t.get('done'):
            continue
        try:
            due      = datetime.strptime(t['due'], '%Y-%m-%d').date()
            days_left = max((due - today).days, 0.5)
            score     = round(weight.get(t.get('priority', 'medium'), 1) / days_left, 2)
            scored.append({**t, 'urgency_score': score})
        except (KeyError, ValueError):
            continue

    scored.sort(key=lambda x: x['urgency_score'], reverse=True)
    return jsonify({'tasks': scored})


# ── Run ───────────────────────────────────────────────────────
if __name__ == '__main__':
    print("🚀 StudyMate Python backend running at http://localhost:5000")
    app.run(debug=True, port=5000)