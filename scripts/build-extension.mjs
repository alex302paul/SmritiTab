import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "dist");

const runtimeFiles = [
  "manifest.json",
  "index.html",
  "background",
  "assets",
];

const verifyScript = path.join(projectRoot, "scripts", "verify-extension.mjs");

function runVerification(target) {
  const result = spawnSync(
    process.execPath,
    [verifyScript, target],
    { cwd: projectRoot, stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`Extension verification failed for ${target}.`);
  }
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

for (const relativePath of runtimeFiles) {
  const source = path.join(projectRoot, relativePath);
  const destination = path.join(outputDir, relativePath);

  try {
    await fs.access(source);
  } catch {
    throw new Error(`Cannot build extension: required runtime path is missing: ${relativePath}`);
  }

  await fs.cp(source, destination, { recursive: true });
}

runVerification(outputDir);
console.log("SmritiTab extension package created at ./dist");
