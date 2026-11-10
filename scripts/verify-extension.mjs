import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[2] || ".");
const errors = [];
const checked = [];

function fail(message) {
  errors.push(message);
}

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    fail(`Missing required file: ${relativePath}`);
    return false;
  }
  checked.push(relativePath);
  return true;
}

function checkJavaScript(relativePath) {
  if (!requireFile(relativePath)) return;
  const result = spawnSync(
    process.execPath,
    ["--check", path.join(root, relativePath)],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    fail(`JavaScript syntax check failed for ${relativePath}:\n${result.stderr || result.stdout}`);
  }
}

function resolveExtensionPath(value, sourceFile) {
  if (!value || typeof value !== "string" || /^[a-z]+:/i.test(value) || value.startsWith("//")) {
    return null;
  }
  const clean = value.split(/[?#]/, 1)[0];
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), clean));
}

const manifestPath = path.join(root, "manifest.json");
if (!requireFile("manifest.json")) {
  console.error("Extension verification failed: manifest.json is missing.");
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`manifest.json is invalid JSON: ${error.message}`);
}

if (manifest) {
  if (manifest.manifest_version !== 3) fail("manifest_version must be 3.");

  const newTab = manifest.chrome_url_overrides?.newtab;
  if (newTab && !requireFile(newTab)) fail(`New Tab entry point does not exist: ${newTab}`);

  const worker = manifest.background?.service_worker;
  if (worker) checkJavaScript(worker);

  for (const iconPath of Object.values(manifest.icons || {})) {
    if (typeof iconPath === "string") requireFile(iconPath);
  }

  for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
    if (typeof iconPath === "string") requireFile(iconPath);
  }
}

const htmlPath = path.join(root, "index.html");
if (fs.existsSync(htmlPath)) {
  checked.push("index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const refs = [
    ...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g),
  ];

  for (const [, reference] of refs) {
    const resolved = resolveExtensionPath(reference, "index.html");
    if (!resolved) continue;
    if (!requireFile(resolved)) fail(`index.html references a missing local asset: ${reference}`);
    if (/\.m?js$/i.test(resolved)) checkJavaScript(resolved);
  }
} else {
  fail("Missing required file: index.html");
}

const uniqueChecked = [...new Set(checked)];
if (errors.length) {
  console.error("SmritiTab extension verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`SmritiTab extension verification passed (${uniqueChecked.length} required files checked).`);
