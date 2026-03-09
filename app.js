const state = { data: [], index: [], updatedAt: null };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function money(v, curr = "PLN") {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: curr }).format(v || 0);
}
function datePL(s) {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("pl-PL");
}

async function loadData() {
  const res = await fetch("./data.json", { cache: "no-store" });
  const json = await res.json();
  state.data = json.klienci || [];
  state.updatedAt = json.zaktualizowano || null;
  state.index = state.data.map((c, i) => ({ name: c.nazwa, i }));
}

function suggest(q) {
  const s = q.trim().toLowerCase();
  if (s.length < 3) return [];
  return state.index.filter(x => x.name.toLowerCase().includes(s)).slice(0, 24);
}

function renderSuggestions(list) {
  const ul = $("#suggest");
  ul.innerHTML = "";
  if (!list.length) { ul.classList.add("hidden"); return; }
  ul.classList.remove("hidden");
  list.forEach(item => {
    const li = document.createElement("li");
    li.className = "px-3 py-2 cursor-pointer hover:bg-slate-50";
    li.textContent = item.name;
    li.onclick = () => {
      $("#q").value = item.name;
      ul.classList.add("hidden");
      showCustomer(item.i);
    };
    ul.appendChild(li);
  });
}

function showCustomer(idx) {
  const c = state.data[idx];
  const res = $("#result"), empty = $("#nores");
  if (!c) { res.classList.add("hidden"); empty.classList.remove("hidden"); return; }

  empty.classList.add("hidden");
  res.classList.remove("hidden");

  $("#cust-name").textContent = c.nazwa;
  $("#saldo").textContent = money(c.suma_pozostalo, c.waluta);
  $("#liczba").textContent = String(c.faktury.length);
  $("#updated").textContent = state.updatedAt ? datePL(state.updatedAt) : "";

  const tbody = $("#tbody");
  tbody.innerHTML = "";
  c.faktury.forEach(f => {
    const ok = (f.pozostalo_do_zaplaty || 0) <= 0.0001 || f.status === "zapłacona";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap">${f.numer_faktury || ""}</td>
      <td class="px-4 py-3 whitespace-nowrap">${datePL(f.data_wystawienia)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${datePL(f.termin_platnosci)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${money(f.wartosc_brutto, f.waluta)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${money(f.pozostalo_do_zaplaty, f.waluta)}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}">
          <span class="size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}"></span>
          ${ok ? "zapłacona" : "niezapłacona"}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function onQueryInput() {
  const q = $("#q").value;
  renderSuggestions(suggest(q));
  const exact = state.index.find(x => x.name.toLowerCase() === q.trim().toLowerCase());
  if (exact) showCustomer(exact.i);
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  $("#q").addEventListener("input", onQueryInput);
  $("#q").addEventListener("focus", onQueryInput);
  $("#clear").addEventListener("click", () => {
    $("#q").value = "";
    $("#suggest").classList.add("hidden");
    $("#result").classList.add("hidden");
    $("#nores").classList.add("hidden");
    $("#q").focus();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("section")) $("#suggest").classList.add("hidden");
  });
});

``
