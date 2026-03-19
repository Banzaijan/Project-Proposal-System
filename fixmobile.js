const fs = require('fs');

const file = 'dashboard.html';
let c = fs.readFileSync(file, 'utf8');

// Fix mobile CSS - make subjects grid 2 columns and fix greeting size
const oldCSS = `@media(max-width:768px){
      .sidebar{display:none;}
      .main{margin-left:0;padding:1rem;padding-top:calc(56px + 1rem);padding-bottom:calc(var(--bottom-nav-h) + 1rem);}
      .mobile-header{display:flex;}
      .bottom-nav{display:block;}
      .page-header{display:none;}
      .subjects-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));}
      .notif{bottom:calc(var(--bottom-nav-h) + 0.75rem);right:1rem;left:1rem;text-align:center;}
    }`;

const newCSS = `@media(max-width:768px){
      .sidebar{display:none;}
      .main{margin-left:0;padding:0.85rem;padding-top:calc(56px + 0.85rem);padding-bottom:calc(var(--bottom-nav-h) + 1rem);}
      .mobile-header{display:flex;}
      .bottom-nav{display:block;}
      .page-header{display:none;}
      .subjects-grid{grid-template-columns:repeat(2,1fr);gap:0.75rem;}
      .subject-card{padding:1rem;}
      .subject-name{font-size:0.82rem;}
      .subject-meta{font-size:0.68rem;}
      .two-col{grid-template-columns:1fr;gap:1rem;}
      .panel{padding:1rem;}
      .mobile-greeting div:first-child{font-size:1.15rem !important;}
      .notif{bottom:calc(var(--bottom-nav-h) + 0.75rem);right:1rem;left:1rem;text-align:center;}
    }`;

c = c.replace(oldCSS, newCSS);
fs.writeFileSync(file, c);
console.log('Fixed mobile layout in dashboard.html!');