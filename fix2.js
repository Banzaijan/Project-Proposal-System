const fs = require('fs');
const path = require('path');

const dirs = [
  '.',
  'www',
  'android/app/src/main/assets/public',
  'android/app/build/intermediates/assets/debug/mergeDebugAssets/public'
];

const files = [
  'index.html','dashboard.html','tasks.html','reminders.html',
  'tracker.html','focus.html','profile.html','grades.html',
  'schedule.html','notification.html','notifications.html'
];

dirs.forEach(dir => {
  files.forEach(f => {
    const fp = path.join(dir, f);
    if (!fs.existsSync(fp)) return;
    let c = fs.readFileSync(fp, 'utf8');
    c = c.replace(/StudyMate/g, 'MyTracker');
    c = c.replace(/Academic Companion/g, 'Track Smart. Study Hard.');
    fs.writeFileSync(fp, c);
    console.log('Fixed:', fp);
  });
});

console.log('\nDone! Now run: npx cap copy && npx cap sync');