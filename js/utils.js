/**
 * UTILS.JS — Funzioni di utilità globali
 */

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0,10);
}

function getDayName(dateStr) {
  const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  return days[new Date(dateStr + 'T12:00:00').getDay()];
}

function hourLabel(h) { 
  return h + ':00'; 
}

function debounce(fn, ms=300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
