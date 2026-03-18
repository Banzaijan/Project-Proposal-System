// ============================================================
//  classroom.js  –  Google Classroom API Integration
//  Enforces: Google account must match the logged-in email
// ============================================================

import { db, auth } from './firebase.js';
import {
  collection, addDoc, getDocs, setDoc, doc,
  query, where, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const GOOGLE_CLIENT_ID =
  '723162762019-d2n8pfvrj8fhhdp4268fjrb962a6b4hp.apps.googleusercontent.com';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'email',
  'profile',
].join(' ');

const LS_KEY = 'studymate_gc_data';

let tokenClient;
let accessToken = null;

// ── Init: restore saved state + setup Google Auth ──────────
export function initGoogleAuth() {
  restoreClassroomState();

  if (typeof google === 'undefined') {
    setTimeout(initGoogleAuth, 500);
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        console.error('Auth error:', response);
        setStatus('Google sign-in failed. Try again.', 'error');
        return;
      }
      accessToken = response.access_token;

      const emailMatch = await verifyGoogleEmail();
      if (!emailMatch) return;

      fetchClassroomData();
    },
  });
}

// ── Check Google email === Firebase email ──────────────────
async function verifyGoogleEmail() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    setStatus('You are not logged in. Please log in first.', 'error');
    return false;
  }

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const info = await res.json();
    const googleEmail = (info.email || '').toLowerCase().trim();
    const firebaseEmail = (firebaseUser.email || '').toLowerCase().trim();

    if (googleEmail !== firebaseEmail) {
      setStatus(
        `❌ Wrong Google account! You must sign in with "${firebaseEmail}" — not "${googleEmail}".`,
        'error'
      );
      accessToken = null;
      return false;
    }
    return true;
  } catch (e) {
    console.error('Email verify error:', e);
    setStatus('Could not verify your Google account. Try again.', 'error');
    return false;
  }
}

// ── Restore saved classroom data ───────────────────────────
// Try localStorage first, then fall back to Firestore
function restoreClassroomState() {
  const firebaseUser = auth.currentUser;

  // Try localStorage first (fast)
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (firebaseUser && data.userId && data.userId !== firebaseUser.uid) {
        localStorage.removeItem(LS_KEY);
      } else if (data.courses && data.courses.length) {
        window.dispatchEvent(new CustomEvent('classroom-connected', {
          detail: { courses: data.courses, announcements: data.announcements || [] }
        }));
        setStatus('✅ Google Classroom connected.', 'success');
        updateConnectButton(true);
        return;
      }
    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
  }

  // Fall back to Firestore (survives logout)
  if (firebaseUser) {
    loadFromFirestore(firebaseUser.uid);
  } else {
    // Wait for auth to be ready then try Firestore
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (user) loadFromFirestore(user.uid);
    });
  }
}

// ── Load announcements + courses from Firestore ────────────
async function loadFromFirestore(uid) {
  try {
    const snap = await getDocs(
      query(collection(db, 'classroom_data'), where('userId', '==', uid))
    );
    if (snap.empty) return;

    const data = snap.docs[0].data();
    const courses = data.courses || [];
    const announcements = data.announcements || [];

    if (!courses.length) return;

    // Re-save to localStorage for faster future loads
    localStorage.setItem(LS_KEY, JSON.stringify({
      userId: uid,
      courses,
      announcements,
      savedAt: new Date().toISOString(),
    }));

    window.dispatchEvent(new CustomEvent('classroom-connected', {
      detail: { courses, announcements }
    }));
    setStatus('✅ Google Classroom connected.', 'success');
    updateConnectButton(true);
  } catch (e) {
    console.warn('Could not load from Firestore:', e);
  }
}

// ── Update connect button UI ───────────────────────────────
function updateConnectButton(connected) {
  const btn = document.getElementById('gc-btn');
  const txt = document.getElementById('gc-btn-text');
  if (!btn || !txt) return;

  if (connected) {
    btn.className = 'gc-badge connected';
    btn.onclick = null;
    txt.textContent = '✓ Classroom Connected';
  } else {
    btn.className = 'gc-badge';
    btn.onclick = () => window.connectClassroom();
    txt.textContent = 'Connect Google Classroom';
  }
}

// ── Trigger Google login popup ─────────────────────────────
export function connectClassroom() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    setStatus('Please log in to StudyMate first.', 'error');
    return;
  }
  if (!tokenClient) {
    setStatus('Google Auth not ready. Refresh and try again.', 'error');
    return;
  }

  tokenClient.requestAccessToken({
    prompt: 'consent',
    login_hint: firebaseUser.email,
  });
}

// ── Fetch all classroom data ───────────────────────────────
async function fetchClassroomData() {
  setStatus('⏳ Fetching your Google Classroom data…');

  const user = auth.currentUser;
  if (!user) {
    setStatus('Not logged in. Please refresh.', 'error');
    return;
  }

  try {
    // 1. Get active courses
    const coursesRes = await gFetch(
      'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE'
    );
    const courses = coursesRes.courses || [];

    if (!courses.length) {
      setStatus('No active courses found in Google Classroom.', 'warn');
      return;
    }

    // 2. Get existing gcIds to avoid duplicates
    const existingSnap = await getDocs(
      query(collection(db, 'tasks'), where('userId', '==', user.uid))
    );
    const existingGcIds = new Set(
      existingSnap.docs.map(d => d.data().gcId).filter(Boolean)
    );

    // 3. Loop courses
    let addedCount = 0;
    let allAnnouncements = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const course of courses) {
      // Coursework
      try {
        const workRes = await gFetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`
        );
        const works = workRes.courseWork || [];
        course.taskCount = works.length;

        for (const work of works) {
          const gcId = `gc_${work.id}`;
          if (existingGcIds.has(gcId)) continue;

          await addDoc(collection(db, 'tasks'), {
            gcId,
            userId:    user.uid,
            title:     work.title,
            subject:   course.name,
            courseId:  course.id,
            notes:     work.description || '',
            due:       formatDueDate(work.dueDate),
            priority:  calcPriority(work.dueDate),
            type:      detectType(work.title, work.description),
            done:      false,
            source:    'Google Classroom',
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      } catch (e) {
        console.warn(`Coursework error for ${course.name}:`, e);
        course.taskCount = 0;
      }

      // Announcements — last 7 days only, newest first
      try {
        const annRes = await gFetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/announcements?orderBy=updateTime+desc`
        );
        (annRes.announcements || []).forEach(ann => {
          const annDate = new Date(ann.creationTime);
          if (annDate >= sevenDaysAgo) {
            allAnnouncements.push({
              course: course.name,
              text:   ann.text || '',
              date:   ann.creationTime,
            });
          }
        });
      } catch (e) {
        console.warn(`Announcements error for ${course.name}:`, e);
      }
    }

    // Sort announcements newest first
    allAnnouncements.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 4. Save to Firestore (persists across logout/login)
    await setDoc(doc(db, 'classroom_data', user.uid), {
      userId:        user.uid,
      courses,
      announcements: allAnnouncements,
      savedAt:       new Date().toISOString(),
    });

    // 5. Also save to localStorage (fast restore)
    localStorage.setItem(LS_KEY, JSON.stringify({
      userId:        user.uid,
      courses,
      announcements: allAnnouncements,
      savedAt:       new Date().toISOString(),
    }));

    // 6. Fire event → dashboard updates
    window.dispatchEvent(new CustomEvent('classroom-connected', {
      detail: { courses, announcements: allAnnouncements }
    }));

    updateConnectButton(true);

    setStatus(
      addedCount > 0
        ? `✅ ${addedCount} new task(s) added to Tasks & Reminders!`
        : `✅ Classroom connected! All tasks already imported.`,
      'success'
    );

  } catch (err) {
    console.error(err);
    setStatus('Error fetching Classroom data. Check console.', 'error');
  }
}

// ── Helpers ────────────────────────────────────────────────
function detectType(title, desc) {
  const text = (title + ' ' + (desc || '')).toLowerCase();
  if (/exam|test|midterm|final|quiz/.test(text)) return 'exam';
  if (/project|capstone|research/.test(text))    return 'project';
  if (/activity|exercise|practice/.test(text))   return 'activity';
  return 'assignment';
}

async function gFetch(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
  return res.json();
}

function formatDueDate(dueDate) {
  if (!dueDate) return '';
  const { year, month, day } = dueDate;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function calcPriority(dueDate) {
  if (!dueDate) return 'low';
  const due = new Date(dueDate.year, dueDate.month - 1, dueDate.day);
  const diff = (due - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff <= 2) return 'high';
  if (diff <= 5) return 'medium';
  return 'low';
}

function setStatus(msg, type = 'info') {
  const el = document.getElementById('classroom-status');
  if (!el) { console.log(msg); return; }
  const colors = { info:'#6366f1', success:'#22c55e', error:'#ef4444', warn:'#f59e0b' };
  el.style.color = colors[type] || '#fff';
  el.textContent = msg;
}