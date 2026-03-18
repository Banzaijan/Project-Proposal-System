// ============================================================
//  js/auth.js  —  Login, Register, Logout, Auth Guard
// ============================================================

import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const GC_KEY = 'studymate_gc_data';

// ── Switch between Login / Register tabs ─────────────────────
window.switchTab = (tab) => {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0) === (tab === 'login'));
  });
  document.getElementById('login-form').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('auth-error').textContent = '';
};

// ── Login ─────────────────────────────────────────────────────
window.doLogin = async () => {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  clearError();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    clearClassroomIfDifferentUser(cred.user.uid);
    window.location.href = 'dashboard.html';
  } catch (e) {
    showError(friendlyError(e.code));
  }
};

// ── Register ──────────────────────────────────────────────────
window.doRegister = async () => {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  clearError();
  if (!name)  { showError('Please enter your full name.'); return; }
  if (!email) { showError('Please enter your email.'); return; }
  if (pass.length < 6) { showError('Password must be at least 6 characters.'); return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    localStorage.removeItem(GC_KEY);
    window.location.href = 'dashboard.html';
  } catch (e) {
    showError(friendlyError(e.code));
  }
};

// ── Logout ────────────────────────────────────────────────────
window.doLogout = async () => {
  localStorage.removeItem(GC_KEY);
  await signOut(auth);
  window.location.href = 'index.html';
};

// ── Auth Guard — call on every protected page ─────────────────
export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    clearClassroomIfDifferentUser(user.uid);

    const name     = user.displayName || user.email.split('@')[0];
    const nameEl   = document.getElementById('user-name-display');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl)   nameEl.textContent   = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

    callback(user);
  });
}

// ── Redirect if already logged in (for index.html) ───────────
export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'dashboard.html';
  });
}

// ── Clear classroom data if it belongs to a different user ────
function clearClassroomIfDifferentUser(currentUid) {
  try {
    const saved = localStorage.getItem(GC_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (data.userId && data.userId !== currentUid) {
      localStorage.removeItem(GC_KEY);
    }
  } catch (e) {
    localStorage.removeItem(GC_KEY);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg;
}
function clearError() {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = '';
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email':          'Invalid email address.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/email-already-in-use':   'That email is already registered.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/invalid-credential':     'Invalid email or password.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}