import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[2] || ".");
const errors = [];
const checked = [];

function fail(message) {
  errors.push(message);
}

function requireFile(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, absolutePath);

  if (
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot) ||
    !fs.existsSync(absolutePath) ||
    !fs.statSync(absolutePath).isFile()
  ) {
    fail(`Missing or unsafe required file: ${relativePath}`);
    return false;
  }

  checked.push(relativePath);
  return true;
}

function checkJavaScript(relativePath) {
  if (!requireFile(relativePath)) return;

  const result = spawnSync(
    process.execPath,
    ["--check", path.resolve(root, relativePath)],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    fail(`JavaScript syntax check failed for ${relativePath}:\n${result.stderr || result.stdout}`);
  }
}

function resolveExtensionPath(value, sourceFile) {
  if (
    !value ||
    typeof value !== "string" ||
    /^[a-z]+:/i.test(value) ||
    value.startsWith("//")
  ) {
    return null;
  }

  const clean = value.split(/[?#]/, 1)[0];
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), clean));
}

const requiredRuntimeFiles = [
  "manifest.json",
  "index.html",
  "background/service-worker.js",
  "assets/dashboard.bundle.js",
  "assets/dashboard.bundle.css",
  "assets/widgets-redesign.css",
  "assets/accessibility.css",
];

for (const file of requiredRuntimeFiles) requireFile(file);

const manifestPath = path.join(root, "manifest.json");
let manifest;

try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`manifest.json is invalid JSON: ${error.message}`);
}

if (manifest) {
  if (manifest.manifest_version !== 3) fail("manifest_version must be 3.");
  if (!manifest.name || typeof manifest.name !== "string") fail("manifest.name must be a non-empty string.");
  if (!manifest.version || typeof manifest.version !== "string") fail("manifest.version must be a non-empty string.");

  const newTab = manifest.chrome_url_overrides?.newtab;
  if (newTab !== "index.html") {
    fail('chrome_url_overrides.newtab must point to "index.html".');
  } else {
    requireFile(newTab);
  }

  const worker = manifest.background?.service_worker;
  if (!worker) {
    fail("background.service_worker must be configured.");
  } else {
    checkJavaScript(worker);
  }

  for (const iconPath of Object.values(manifest.icons || {})) {
    if (typeof iconPath === "string") requireFile(iconPath);
  }

  for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
    if (typeof iconPath === "string") requireFile(iconPath);
  }
}

const htmlPath = path.join(root, "index.html");
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)];

  if (!html.includes('id="root"')) fail('index.html must include the dashboard mount element with id="root".');
  if (!refs.some(([, reference]) => reference === "./assets/dashboard.bundle.js")) {
    fail("index.html must load ./assets/dashboard.bundle.js.");
  }
  if (!refs.some(([, reference]) => reference === "./assets/accessibility.css")) {
    fail("index.html must load ./assets/accessibility.css.");
  }

  for (const [, reference] of refs) {
    const resolved = resolveExtensionPath(reference, "index.html");
    if (!resolved) continue;

    if (!requireFile(resolved)) {
      fail(`index.html references a missing or unsafe local asset: ${reference}`);
      continue;
    }

    if (/\.m?js$/i.test(resolved)) checkJavaScript(resolved);
  }
}

const uniqueChecked = [...new Set(checked)];
if (errors.length) {
  console.error("SmritiTab extension verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`SmritiTab extension verification passed (${uniqueChecked.length} required files checked).`);
