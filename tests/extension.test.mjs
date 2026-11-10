import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serviceWorkerPath = path.join(projectRoot, "background", "service-worker.js");
const verifierPath = path.join(projectRoot, "scripts", "verify-extension.mjs");

function createEvent() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    async emit(...args) {
      for (const listener of listeners) await listener(...args);
    },
  };
}

function createChromeMock() {
  const calls = { removeAll: 0, createdMenus: [], storageWrites: [], openedTabs: [] };
  const chrome = {
    runtime: {
      lastError: undefined,
      getURL: (file) => `chrome-extension://smrititab/${file}`,
      onInstalled: createEvent(),
      onStartup: createEvent(),
    },
    contextMenus: {
      removeAll(callback) { calls.removeAll += 1; callback(); },
      create(details, callback) { calls.createdMenus.push(details); callback(); },
      onClicked: createEvent(),
    },
    commands: { onCommand: createEvent() },
    storage: { local: { async set(value) { calls.storageWrites.push(value); } } },
    tabs: { async create(details) { calls.openedTabs.push(details); } },
  };
  return { chrome, calls };
}

function assertJsonEqual(actual, expected) {
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
}

async function loadServiceWorker() {
  const { chrome, calls } = createChromeMock();
  const source = fs.readFileSync(serviceWorkerPath, "utf8");
  vm.runInNewContext(source, { chrome, console }, { filename: serviceWorkerPath });
  return { chrome, calls };
}

describe("SmritiTab service worker", () => {
  it("registers the selection context menu on install", async () => {
    const { chrome, calls } = await loadServiceWorker();
    await chrome.runtime.onInstalled.emit();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.removeAll, 1);
    assertJsonEqual(calls.createdMenus[0], {
      id: "smrititab-search-selection",
      title: 'Search SmritiTab for "%s"',
      contexts: ["selection"],
    });
  });

  it("coalesces overlapping install and startup registration", async () => {
    const { chrome, calls } = await loadServiceWorker();
    await Promise.all([chrome.runtime.onInstalled.emit(), chrome.runtime.onStartup.emit()]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.removeAll, 1);
    assert.equal(calls.createdMenus.length, 1);
  });

  it("stores a selected phrase and opens the dashboard", async () => {
    const { chrome, calls } = await loadServiceWorker();
    await chrome.contextMenus.onClicked.emit({
      menuItemId: "smrititab-search-selection",
      selectionText: "  useful research  ",
    });
    assertJsonEqual(calls.storageWrites[0], {
      "smrititab:v1:pending-search": "useful research",
    });
    assertJsonEqual(calls.openedTabs[0], {
      url: "chrome-extension://smrititab/index.html",
      active: true,
    });
  });

  it("ignores unrelated context-menu events and empty selections", async () => {
    const { chrome, calls } = await loadServiceWorker();
    await chrome.contextMenus.onClicked.emit({ menuItemId: "another-menu", selectionText: "ignored" });
    await chrome.contextMenus.onClicked.emit({
      menuItemId: "smrititab-search-selection",
      selectionText: "   ",
    });
    assert.equal(calls.storageWrites.length, 0);
    assert.equal(calls.openedTabs.length, 0);
  });

  it("routes both keyboard commands to the correct dashboard action", async () => {
    const { chrome, calls } = await loadServiceWorker();
    await chrome.commands.onCommand.emit("open-search");
    await chrome.commands.onCommand.emit("toggle-focus-mode");
    assertJsonEqual(calls.storageWrites, [
      { "smrititab:v1:pending-action": "focus-search" },
      { "smrititab:v1:pending-action": "toggle-focus" },
    ]);
    assert.equal(calls.openedTabs.length, 2);
  });

  it("ignores unknown keyboard commands", async () => {
    const { chrome, calls } = await loadServiceWorker();
    await chrome.commands.onCommand.emit("unknown-command");
    assert.equal(calls.storageWrites.length, 0);
    assert.equal(calls.openedTabs.length, 0);
  });
});

describe("extension compatibility contracts", () => {
  it("keeps Chrome permissions required by implemented dashboard features", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));
    const permissions = new Set(manifest.permissions || []);
    for (const permission of [
      "storage", "bookmarks", "history", "tabs",
      "tabGroups", "contextMenus", "clipboardRead", "clipboardWrite",
    ]) {
      assert.ok(permissions.has(permission), `Missing required permission: ${permission}`);
    }
  });

  it("preserves the current persisted data namespace and keys", () => {
    const bundle = fs.readFileSync(path.join(projectRoot, "assets", "dashboard.bundle.js"), "utf8");
    assert.ok(bundle.includes("smrititab:v1"));
    for (const key of [
      "__meta", "settings", "profile", "categories", "apps", "favorites",
      "notes", "todos", "widgets", "dock", "windows", "clipboard", "quotes",
      "weather", "location", "pending-search", "pending-action",
    ]) {
      assert.ok(bundle.includes(`:${key}`), `Missing persisted storage key: ${key}`);
    }
  });

  it("loads the accessibility override after the generated dashboard styles", () => {
    const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
    assert.ok(html.indexOf("./assets/dashboard.bundle.css") < html.indexOf("./assets/accessibility.css"));
    assert.ok(html.includes("./assets/accessibility.css"));
  });

  it("keeps keyboard focus visible with the orange accent and supports forced colors", () => {
    const css = fs.readFileSync(path.join(projectRoot, "assets", "accessibility.css"), "utf8");
    assert.match(css, /:focus-visible/);
    assert.match(css, /#f97316/i);
    assert.match(css, /forced-colors:\s*active/i);
    assert.match(css, /Highlight/);
  });

  it("retains reduced-motion support in the dashboard stylesheet", () => {
    const css = fs.readFileSync(path.join(projectRoot, "assets", "dashboard.bundle.css"), "utf8");
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /animation-duration/);
    assert.match(css, /transition-duration/);
  });
});

describe("extension verifier", () => {
  it("accepts the checked-in extension runtime", () => {
    const result = spawnSync(process.execPath, [verifierPath, projectRoot], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /verification passed/i);
  });

  it("rejects a package with a missing required runtime asset", () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "smrititab-invalid-"));
    try {
      fs.writeFileSync(path.join(fixture, "manifest.json"), JSON.stringify({
        manifest_version: 3,
        name: "Invalid fixture",
        version: "1.0.0",
        chrome_url_overrides: { newtab: "index.html" },
        background: { service_worker: "background/service-worker.js" },
      }));
      fs.mkdirSync(path.join(fixture, "background"), { recursive: true });
      fs.writeFileSync(path.join(fixture, "background", "service-worker.js"), "");
      fs.writeFileSync(path.join(fixture, "index.html"), '<div id="root"></div>');
      const result = spawnSync(process.execPath, [verifierPath, fixture], { encoding: "utf8" });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Missing or unsafe required file/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
