const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = [
  'index.html',
  'dashboard.html',
  'tasks.html',
  'reminders.html',
  'tracker.html',
  'focus.html',
  'profile.html',
  'grades.html',
  'schedule.html',
  'notification.html'
];

console.log('📁 Syncing HTML files to www folder...\n');

files.forEach(f => {
  if (!fs.existsSync(f)) return console.log(`⚠️  Skipped (not found): ${f}`);
  const dest = path.join('www', f);
  fs.copyFileSync(f, dest);
  console.log(`✅ Copied: ${f} → www/${f}`);
});

console.log('\n🔄 Running npx cap copy...');
execSync('npx cap copy', { stdio: 'inherit' });

console.log('\n🔄 Running npx cap sync...');
execSync('npx cap sync', { stdio: 'inherit' });

console.log('\n🎉 Done! Now rebuild APK in Android Studio.');