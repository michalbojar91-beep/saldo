// KONFIGURACJA SUPABASE — PODMIEŃ NA SWOJE DANE
// 1) Wejdź do supabase.com → Project Settings → API i skopiuj:
//    - SUPABASE_URL, - PUBLIC ANON KEY (anon)
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"; // TODO: podmień
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";        // TODO: podmień

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pomocnicze selektory
const $ = (s) => document.querySelector(s);

function moneyGroupByCurrency(rows) {
  // Zwraca mapę { waluta: { saldo, brutto } }
  const map = new Map();
  for (const r of rows) {
    const cur = r.currency || r.waluta || 'PLN';
    const left = Number(r.left_to_pay ?? r.pozostalo_do_zaplaty ?? 0);
    const gross = Number(r.gross ?? r.wartosc_brutto ?? 0);
    const ref = map.get(cur) || { saldo: 0, brutto: 0 };
    ref.saldo += left;
    ref.brutto += gross;
    map.set(cur, ref);
  }
  return map;
}

function formatMoney(v, curr='PLN') {
  return new Intl.NumberFormat('pl-PL', { style:'currency', currency: curr }).format(v || 0);
}
function datePL(s) {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString('pl-PL');
}

async function sendMagicLink() {
  const email = $('#email').value.trim();
  if (!email) return msg('Podaj adres e‑mail.');
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return msg(error.message, true);
  msg('Wysłano link do logowania. Sprawdź skrzynkę (także SPAM).');
}
async function signInPass() {
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return msg(error.message, true);
}
async function signUpPass() {
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return msg(error.message, true);
  msg('Konto utworzone. Sprawdź e‑mail w celu weryfikacji i zaloguj się.');
}
async function signOut() {
  await supabase.auth.signOut();
}

function msg(text, err=false) {
  const el = $('#auth-msg');
  el.textContent = text; el.classList.remove('hidden');
  el.className = `mt-3 text-sm ${err? 'text-rose-700' : 'text-emerald-700'}`;
}

async function loadInvoices() {
  // Pobierz faktury zalogowanego użytkownika z tabeli public.invoices
  const { data, error } = await supabase
    .from('invoices')
    .select('number,issue_date,due_date,currency,gross,left_to_pay,status')
    .order('due_date', { ascending: true });
  if (error) { console.error(error); return; }

  const tbody = $('#tbody');
  tbody.innerHTML = '';
  for (const f of data) {
    const ok = (f.left_to_pay || 0) <= 0.0001 || (f.status||'').toLowerCase()==='zapłacona';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap">${f.number || ''}</td>
      <td class="px-4 py-3 whitespace-nowrap">${datePL(f.issue_date)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${datePL(f.due_date)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${formatMoney(f.gross, f.currency)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${formatMoney(f.left_to_pay, f.currency)}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full ${ok? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
          <span class="size-2 rounded-full ${ok? 'bg-emerald-500' : 'bg-rose-500'}"></span>
          ${ok? 'zapłacona' : 'niezapłacona'}
        </span>
      </td>`;
    tbody.appendChild(tr);
  }

  // Saldo — jeśli wiele walut, pokaż sumy per waluta
  const map = moneyGroupByCurrency(data || []);
  if (map.size <= 1) {
    const [curr, sums] = map.size ? [...map.entries()][0] : ['PLN', {saldo:0}];
    $('#saldo').textContent = formatMoney(sums.saldo, curr);
  } else {
    $('#saldo').innerHTML = [...map.entries()]\
      .map(([c, s]) => `${formatMoney(s.saldo, c)}`)\
      .join(' · ');
  }
}

function toggleUI(authenticated, email='') {
  $('#login').classList.toggle('hidden', authenticated);
  $('#app').classList.toggle('hidden', !authenticated);
  if (authenticated) $('#who').textContent = email;
}

async function init() {
  // Handlery
  $('#btn-magic').onclick = sendMagicLink;
  $('#btn-login').onclick = signInPass;
  $('#btn-signup').onclick = signUpPass;
  $('#btn-logout').onclick = signOut;

  // Obsługa zmian stanu sesji
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const email = session?.user?.email || '';
    toggleUI(!!session, email);
    if (session) await loadInvoices();
  });

  // Sprawdź bieżącą sesję po załadowaniu
  const { data: { session } } = await supabase.auth.getSession();
  toggleUI(!!session, session?.user?.email || '');
  if (session) await loadInvoices();
}

init();
