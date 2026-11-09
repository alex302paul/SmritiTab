/**
 * SmritiTab background service worker (MV3).
 *
 * Responsibilities:
 *  - create the "search the selection" context menu,
 *  - translate keyboard commands into actions for the dashboard tab.
 *
 * The worker is intentionally tiny and stateless: everything it needs to pass
 * to the dashboard is written to chrome.storage.local, which the dashboard
 * already reads on start-up.
 */

const NAMESPACE = "smrititab:v1";
const PENDING_SEARCH_KEY = `${NAMESPACE}:pending-search`;
const PENDING_ACTION_KEY = `${NAMESPACE}:pending-action`;
const MENU_ID = "smrititab-search-selection";

let menuRegistration;

/**
 * Refresh the context menu once per install/startup event.
 * Context menus survive service-worker suspension, so registration on every
 * worker evaluation is unnecessary. Coalesce overlapping lifecycle events.
 */
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
          if (error) {
            console.warn("[SmritiTab] Could not create the context menu.", error.message);
          }
        },
      );
    } catch (error) {
      console.warn("[SmritiTab] Could not register the context menu.", error);
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

chrome.runtime.onInstalled.addListener(() => {
  void registerContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  void registerContextMenu();
});

chrome.contextMenus.onClicked.addListener((data) => {
  if (data.menuItemId !== MENU_ID) return;
  const selection = (data.selectionText || "").trim();
  if (!selection) return;

  chrome.storage.local
    .set({ [PENDING_SEARCH_KEY]: selection })
    .then(() => openDashboard())
    .catch((error) => {
      console.warn("[SmritiTab] Could not open the dashboard.", error);
    });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-search") {
    chrome.storage.local
      .set({ [PENDING_ACTION_KEY]: "focus-search" })
      .then(() => openDashboard())
      .catch((error) => {
        console.warn("[SmritiTab] Could not open search.", error);
      });
    return;
  }

  if (command === "toggle-focus-mode") {
    chrome.storage.local
      .set({ [PENDING_ACTION_KEY]: "toggle-focus" })
      .then(() => openDashboard())
      .catch((error) => {
        console.warn("[SmritiTab] Could not toggle focus mode.", error);
      });
  }
});
