const fs = require('fs');

const files = [
  'dashboard.html','index.html','tasks.html','reminders.html',
  'tracker.html','focus.html','profile.html','grades.html',
  'schedule.html','notifications.html'
];

const TARGET_ICON_BIG = `<svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <circle cx="12" cy="12" r="9" stroke="#f97316" stroke-width="2"/>
        <circle cx="12" cy="12" r="5" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
        <circle cx="12" cy="12" r="2" fill="#f97316"/>
      </svg>`;

const TARGET_ICON_SMALL = `<svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <circle cx="12" cy="12" r="9" stroke="#f97316" stroke-width="2"/>
        <circle cx="12" cy="12" r="5" stroke="#f97316" stroke-width="1.5" opacity="0.6"/>
        <circle cx="12" cy="12" r="2" fill="#f97316"/>
      </svg>`;

const LOGO_TEXT = `<div>
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;background:linear-gradient(135deg,#f97316,#fdba74);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">MyTracker</div>
      <div style="font-size:0.6rem;color:#666;letter-spacing:0.5px;text-transform:uppercase;margin-top:1px;">Track Smart. Study Hard.</div>
    </div>`;

files.forEach(f => {
  if (!fs.existsSync(f)) { console.log('SKIP:', f); return; }
  let c = fs.readFileSync(f, 'utf8');

  // STEP 1: Replace all text
  c = c.replace(/StudyMate/g, 'MyTracker');
  c = c.replace(/Academic Companion/g, 'Track Smart. Study Hard.');
  c = c.replace(/academic companion/g, 'Track Smart. Study Hard.');
  c = c.replace(/ACADEMIC COMPANION/g, 'TRACK SMART. STUDY HARD.');
  c = c.replace(/Technology &amp; Information/g, 'Track Smart. Study Hard.');
  c = c.replace(/Your smart academic companion/g, 'Track Smart. Study Hard.');

  // STEP 2: Replace ANY svg inside logo-icon div (sidebar - 38px)
  c = c.replace(
    /(<div[^>]*(?:class="logo-icon"|logo-icon)[^>]*>)\s*<svg[\s\S]*?<\/svg>\s*(<\/div>)/g,
    `$1\n      ${TARGET_ICON_BIG}\n    $2`
  );

  // STEP 3: Replace logo text block after icon
  c = c.replace(
    /<div>\s*<div[^>]*>(?:MyTracker|StudyMate)<\/div>[\s\S]{0,200}?<\/div>\s*<\/div>/g,
    LOGO_TEXT
  );

  // STEP 4: Fix logo-sub class text
  c = c.replace(
    /<div class="logo-sub">[^<]*<\/div>/g,
    '<div style="font-size:0.6rem;color:#666;letter-spacing:0.5px;text-transform:uppercase;margin-top:1px;">Track Smart. Study Hard.</div>'
  );

  // STEP 5: Replace mobile header 30px icon SVG
  c = c.replace(
    /(<div style="width:30px;height:30px[^"]*"[^>]*>)\s*<svg[\s\S]*?<\/svg>\s*(<\/div>)/g,
    `$1\n      ${TARGET_ICON_SMALL}\n    $2`
  );

  // STEP 6: Fix mobile span text
  c = c.replace(
    /(<span style="[^"]*Syne[^"]*">)(?:MyTracker|StudyMate)(<\/span>)/g,
    '<span style="font-family:Syne,sans-serif;font-weight:800;font-size:1rem;background:linear-gradient(135deg,#f97316,#fdba74);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">MyTracker</span>'
  );

  fs.writeFileSync(f, c, 'utf8');
  console.log('✅ Updated:', f);
});

console.log('\nDone! Run: npx cap copy && npx cap sync');