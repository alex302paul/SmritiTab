import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[2] || ".");
const errors = [];
const checked = new Set();
function fail(message) { errors.push(message); }
function requireFile(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, absolutePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot) || !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    fail(`Missing or unsafe required file: ${relativePath}`);
    return false;
  }
  checked.add(relativePath);
  return true;
}
function checkJavaScript(relativePath) {
  if (!requireFile(relativePath)) return;
  const result = spawnSync(process.execPath, ["--check", path.resolve(root, relativePath)], { encoding: "utf8" });
  if (result.status !== 0) fail(`JavaScript syntax check failed for ${relativePath}:\n${result.stderr || result.stdout}`);
}
function resolveLocal(value, sourceFile) {
  if (!value || typeof value !== "string" || /^[a-z]+:/i.test(value) || value.startsWith("//")) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), value.split(/[?#]/, 1)[0]));
}
for (const file of ["manifest.json","index.html","background/service-worker.js","assets/index-Dovv645t.js","assets/index-BpZImi0k.css","assets/accessibility.css","assets/rapidfile-wallpapers.js","assets/quick-links-seed.js","assets/hover-clock.js","assets/dashboard.bundle.js","assets/dashboard.bundle.css","assets/cards-sticky.css","assets/widgets-redesign.css"]) requireFile(file);
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8")); }
catch (error) { fail(`manifest.json is invalid JSON: ${error.message}`); }
if (manifest) {
  if (manifest.manifest_version !== 3) fail("manifest_version must be 3.");
  if (!manifest.name || typeof manifest.name !== "string") fail("manifest.name must be a non-empty string.");
  if (!manifest.version || typeof manifest.version !== "string") fail("manifest.version must be a non-empty string.");
  if (manifest.chrome_url_overrides?.newtab !== "index.html") fail('chrome_url_overrides.newtab must point to "index.html".');
  else requireFile("index.html");
  if (!manifest.background?.service_worker) fail("background.service_worker must be configured.");
  else checkJavaScript(manifest.background.service_worker);
  const permissions = new Set(manifest.permissions || []);
  for (const permission of ["storage","bookmarks","history","tabs","tabGroups","contextMenus","clipboardRead","clipboardWrite"]) if (!permissions.has(permission)) fail(`Missing required Chrome permission: ${permission}`);
}
const htmlPath = path.join(root,"index.html");
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath,"utf8");
  if (!html.includes('id="root"')) fail('index.html must include the dashboard mount element with id="root".');
  if (!html.includes("./assets/index-Dovv645t.js")) fail("index.html must load the Raw dashboard bundle.");
  if (!html.includes("./assets/index-BpZImi0k.css")) fail("index.html must load the Raw dashboard stylesheet.");
  if (!html.includes("./assets/rapidfile-wallpapers.js")) fail("index.html must load the Rapidfile wallpaper catalog.");
  if (!html.includes("./assets/quick-links-seed.js")) fail("index.html must load the user Quick Links seed.");
  if (!html.includes("./assets/hover-clock.js")) fail("index.html must load the centered hover clock.");
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)];
  for (const [,reference] of refs) {
    const resolved = resolveLocal(reference,"index.html");
    if (!resolved) continue;
    if (!requireFile(resolved)) fail(`index.html references a missing or unsafe local asset: ${reference}`);
    else if (/\.m?js$/i.test(resolved)) checkJavaScript(resolved);
  }
}
if (errors.length) { console.error("SmritiTab extension verification failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log(`SmritiTab extension verification passed (${checked.size} required files checked).`);
