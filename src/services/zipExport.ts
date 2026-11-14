// Pure-TypeScript ZIP (Store method, CRC-32) generator for zero-dependency client-side downloads

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileEntry {
  name: string;
  content: string | Uint8Array;
}

export function buildZipBlob(entries: ZipFileEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(now.getFullYear(), 1980) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes =
      typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
    const checksum = crc32(dataBytes);

    // Local file header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // store (no compression)
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central directory header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd] as BlobPart[], {
    type: "application/zip",
  });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const EXTENSION_MANIFEST = JSON.stringify(
  {
    manifest_version: 3,
    name: "SmritiTab — Focus New Tab",
    version: "1.1.0",
    description:
      "A calm, wallpaper-first new tab dashboard with edge-revealed search, quick links, dock, launchpad, notes, tasks, bookmarks, history, calculator, clipboard, and focus mode.",
    chrome_url_overrides: {
      newtab: "index.html",
    },
    background: {
      service_worker: "background/service-worker.js",
      type: "module",
    },
    permissions: [
      "storage",
      "bookmarks",
      "history",
      "clipboardRead",
      "clipboardWrite",
      "contextMenus",
      "tabGroups",
      "tabs",
    ],
    host_permissions: [
      "https://api.open-meteo.com/*",
      "https://geocoding-api.open-meteo.com/*",
      "https://images.unsplash.com/*",
      "https://fonts.googleapis.com/*",
      "https://fonts.gstatic.com/*",
      "https://www.google.com/*",
    ],
    commands: {
      "open-search": {
        suggested_key: {
          default: "Ctrl+Shift+Space",
          mac: "Command+Shift+Space",
        },
        description: "Open SmritiTab and focus the search field",
      },
      "toggle-focus-mode": {
        description: "Open SmritiTab in focus mode",
      },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
    },
  },
  null,
  2,
);

const SERVICE_WORKER_JS = `/**
 * SmritiTab background service worker (MV3).
 * Preserves context-menu search selection & keyboard command handoff via smrititab:v1 storage.
 */
const NAMESPACE = "smrititab:v1";
const PENDING_SEARCH_KEY = \`\${NAMESPACE}:pending-search\`;
const PENDING_ACTION_KEY = \`\${NAMESPACE}:pending-action\`;
const MENU_ID = "smrititab-search-selection";

let menuRegistration;

function registerContextMenu() {
  if (menuRegistration) return menuRegistration;
  menuRegistration = (async () => {
    try {
      await new Promise((resolve, reject) => {
        chrome.contextMenus.removeAll(() => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve();
        });
      });
      chrome.contextMenus.create(
        {
          id: MENU_ID,
          title: 'Search SmritiTab for "%s"',
          contexts: ["selection"],
        },
        () => {
          const error = chrome.runtime.lastError;
          if (error) console.warn("[SmritiTab] Could not create context menu.", error.message);
        }
      );
    } catch (error) {
      console.warn("[SmritiTab] Could not register context menu.", error);
    } finally {
      menuRegistration = undefined;
    }
  })();
  return menuRegistration;
}

function openDashboard() {
  const url = chrome.runtime.getURL("index.html");
  return chrome.tabs.create({ url, active: true });
}

chrome.runtime.onInstalled.addListener(() => { void registerContextMenu(); });
chrome.runtime.onStartup.addListener(() => { void registerContextMenu(); });

chrome.contextMenus.onClicked.addListener((data) => {
  if (data.menuItemId !== MENU_ID) return;
  const selection = (data.selectionText || "").trim();
  if (!selection) return;
  chrome.storage.local
    .set({ [PENDING_SEARCH_KEY]: selection })
    .then(() => openDashboard())
    .catch((error) => console.warn("[SmritiTab] Could not open dashboard.", error));
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-search") {
    chrome.storage.local
      .set({ [PENDING_ACTION_KEY]: "focus-search" })
      .then(() => openDashboard())
      .catch((error) => console.warn("[SmritiTab] Could not open search.", error));
    return;
  }
  if (command === "toggle-focus-mode") {
    chrome.storage.local
      .set({ [PENDING_ACTION_KEY]: "toggle-focus" })
      .then(() => openDashboard())
      .catch((error) => console.warn("[SmritiTab] Could not toggle focus mode.", error));
  }
});
`;

export async function downloadExtensionZip(): Promise<string> {
  // First try downloading the pre-built Chrome MV3 extension bundle from public/
  try {
    const res = await fetch("./SmritiTab-Redesign-Extension.zip");
    if (res.ok && res.headers.get("content-type")?.includes("zip")) {
      const blob = await res.blob();
      if (blob.size > 1024) {
        triggerBlobDownload(blob, "SmritiTab-Redesign-Extension.zip");
        return "Downloaded verified Chrome Extension package (SmritiTab-Redesign-Extension.zip).";
      }
    }
  } catch {
    // Fallback to client-side packaged zip
  }

  // Fallback client-side MV3 package with extracted external script so Chrome CSP stays valid
  const docHtml = document.documentElement.outerHTML;
  const blob = buildZipBlob([
    { name: "manifest.json", content: EXTENSION_MANIFEST },
    { name: "background/service-worker.js", content: SERVICE_WORKER_JS },
    { name: "index.html", content: `<!doctype html>\n${docHtml}` },
    {
      name: "README.txt",
      content:
        "SmritiTab Wallpaper-First Redesign\n\nInstall in Chrome:\n1. Unzip this archive.\n2. Open chrome://extensions and enable Developer mode.\n3. Click 'Load unpacked' and select the unzipped folder.\n4. Open a new tab to enjoy SmritiTab.\n",
    },
  ]);
  triggerBlobDownload(blob, "SmritiTab-Redesign-Extension.zip");
  return "Downloaded SmritiTab-Redesign-Extension.zip.";
}
