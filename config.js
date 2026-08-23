/* ============================================================
   EDIT THESE BEFORE THE EVENT
   ============================================================ */

// Paste the Web App URL you get after deploying the Apps Script (see README.md)
const WEB_APP_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

// Must exactly match ADMIN_PASSWORD in apps-script-code.gs
const ADMIN_PASSWORD = 'qualitracker2026';

// Replace with your real region -> district -> facility list.
const REGION_DATA = {
  "Dar es Salaam": {
    "Ilala": ["Amana Regional Referral Hospital", "Ilala Health Centre"],
    "Kinondoni": ["Mwananyamala Regional Hospital", "Kinondoni Health Centre"],
    "Temeke": ["Temeke Regional Referral Hospital"]
  },
  "Arusha": {
    "Arusha City": ["Mount Meru Regional Referral Hospital", "Arusha Lutheran Medical Centre"],
    "Meru": ["Nkoaranga Hospital", "Meru District Hospital"]
  },
  "Mwanza": {
    "Nyamagana": ["Bugando Medical Centre", "Sekou Toure Regional Hospital"],
    "Ilemela": ["Ilemela District Hospital"]
  },
  "Dodoma": { "Dodoma City": ["Dodoma Regional Referral Hospital", "Benjamin Mkapa Hospital"] },
  "Mbeya": { "Mbeya City": ["Mbeya Zonal Referral Hospital", "Meta Health Centre"] },
  "Kilimanjaro": { "Moshi": ["Kilimanjaro Christian Medical Centre (KCMC)", "Mawenzi Regional Referral Hospital"] }
};

/* ============================================================
   Shared helpers — no need to edit below this line
   ============================================================ */

const QUIZ_NAME = "QualiTracker Quiz";
const QUESTION_SECONDS = 15;
const QUIZ_LENGTH = 10;
const PIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, avoids confusion
const PIN_LENGTH = 6;

function generatePin(){
  let s = '';
  for(let i=0;i<PIN_LENGTH;i++) s += PIN_CHARS[Math.floor(Math.random()*PIN_CHARS.length)];
  return s;
}

function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function shuffle(arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// GET request — reads. Simple fetch, no CORS complications.
async function apiGet(action, extraParams){
  const params = new URLSearchParams(Object.assign({ action }, extraParams || {}));
  const res = await fetch(WEB_APP_URL + '?' + params.toString());
  return res.json();
}

// POST request — writes. Uses text/plain to avoid a CORS preflight that
// Apps Script web apps don't handle; Apps Script still parses the JSON body fine.
async function apiPost(payload){
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function fileToResizedDataUrl(file, size, quality){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function headerBlock(subtitle){
  return `
    <div class="header">
      <div class="eyebrow">Conference Quiz</div>
      <h1>${QUIZ_NAME}</h1>
      <p>${subtitle}</p>
      <svg class="pulse-line" viewBox="0 0 220 22" preserveAspectRatio="none">
        <path d="M0,11 L60,11 L72,2 L84,20 L96,11 L220,11" />
      </svg>
    </div>`;
}
