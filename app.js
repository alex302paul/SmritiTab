const STORAGE_KEY = 'startdock-items';
const form = document.querySelector('#entry-form');
const search = document.querySelector('#search');
const list = document.querySelector('#items');
const summary = document.querySelector('#summary');
const seed = [{"id":"seed-0","title":"Vercel Pro","category":"Infrastructure"},{"id":"seed-1","title":"Linear Workspace","category":"Design"}];
let items;
try { items = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? seed; } catch { items = seed; }

function render() {
  list.replaceChildren();
  const q = search.value.trim().toLowerCase();
  const filtered = items.filter(item => item.title.toLowerCase().includes(q));
  summary.textContent = filtered.length + ' of ' + items.length + ' records';
  for (const item of filtered) {
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = item.title + ' · ' + item.category;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { items = items.filter(record => record.id !== item.id); persist(); });
    row.append(label, remove); list.append(row);
  }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); render(); }
form.addEventListener('submit', event => {
  event.preventDefault();
  const title = form.elements.title.value.trim();
  if (!title) return;
  items.unshift({ id: crypto.randomUUID(), title, category: form.elements.category.value });
  form.reset(); persist();
});
search.addEventListener('input', render);
render();

      <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500">
        Action
      
      <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500">
        Action
      </button>
</button>
// Startdock update
// Startdock update
// TODO: refine app.js layout spacing
