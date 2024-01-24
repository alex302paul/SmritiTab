const STORAGE_KEY = 'startdock-items';
const form = document.querySelector('#entry-form');
const search = document.querySelector('#search');
const list = document.querySelector('#items');
const summary = document.querySelector('#summary');
const seed = [{"id":"seed-0","title":"Vercel Pro","category":"Infrastructure"},{"id":"seed-1","title":"Linear Workspace","category":"Design"}];
let items;
try { items = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? seed; } catch { items = seed; }

