(() => {
  "use strict";
  const APPS = [
    { group: "Google Apps", items: [["Gmail","M","https://mail.google.com"],["Calendar","C","https://calendar.google.com"],["Drive","D","https://drive.google.com"],["Google Search","G","https://www.google.com"],["Google Photos","P","https://photos.google.com"]] },
    { group: "AI Apps", items: [["ChatGPT","AI","https://chatgpt.com"],["Perplexity","P","https://www.perplexity.ai"]] },
    { group: "Social Media", items: [["YouTube","Y","https://www.youtube.com"],["Reddit","R","https://www.reddit.com"]] }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  let shell, search, dock, quickLinks, quickHome, quickNext, activeOverlay = null;
  let dockPinned = false, searchPinned = false;
  const button = (label, id, className = "smriti-edge-trigger") => {
    const el = document.createElement("button"); el.type = "button"; el.id = id; el.className = className; el.setAttribute("aria-label", label); el.title = label; return el;
  };
  function openOverlay(node, kind) {
    closeOverlay();
    const backdrop = document.createElement("div"); backdrop.className = "smriti-redesign-backdrop"; backdrop.dataset.smritiOverlay = kind;
    backdrop.addEventListener("click", e => { if (e.target === backdrop) closeOverlay(); });
    const panel = document.createElement("section"); panel.className = "smriti-redesign-panel " + (kind === "quicklinks" ? "smriti-quicklinks-panel" : ""); panel.setAttribute("role","dialog"); panel.setAttribute("aria-modal","true"); panel.setAttribute("aria-label", kind === "quicklinks" ? "Quick Links" : "App launcher");
    const close = button("Close", "smriti-overlay-close", "smriti-redesign-close"); close.textContent = "×"; close.addEventListener("click", closeOverlay);
    const heading = document.createElement("h2"); heading.textContent = kind === "quicklinks" ? "Quick Links" : "Launchpad";
    panel.append(close, heading);
    if (node) panel.append(node);
    backdrop.append(panel); document.body.append(backdrop); document.body.classList.add("smriti-overlay-open");
    activeOverlay = { backdrop, node, kind }; close.focus();
  }
  function closeOverlay() {
    if (!activeOverlay) return;
    const { backdrop, node, kind } = activeOverlay;
    if (kind === "quicklinks" && node && quickHome) quickHome.insertBefore(node, quickNext && quickNext.parentNode === quickHome ? quickNext : null);
    backdrop.remove(); activeOverlay = null; document.body.classList.remove("smriti-overlay-open");
  }
  function openQuickLinks() {
    if (!quickLinks) return;
    quickHome = quickLinks.parentNode; quickNext = quickLinks.nextSibling;
    openOverlay(quickLinks, "quicklinks");
  }
  function openLauncher() {
    const groups = document.createElement("div"); groups.className = "smriti-launcher-groups";
    APPS.forEach(group => {
      const section = document.createElement("section"); section.className = "smriti-launcher-group";
      const title = document.createElement("h3"); title.textContent = group.group;
      const list = document.createElement("div"); list.className = "smriti-launcher-apps";
      group.items.forEach(([name, mark, url]) => {
        const item = document.createElement("button"); item.type = "button"; item.className = "smriti-launcher-app";
        const icon = document.createElement("span"); icon.className = "smriti-launcher-icon"; icon.textContent = mark;
        const label = document.createElement("span"); label.className = "smriti-launcher-label"; label.textContent = name;
        item.append(icon,label); item.addEventListener("click", () => window.open(url, "_blank", "noopener,noreferrer")); list.append(item);
      });
      section.append(title,list); groups.append(section);
    });
    openOverlay(groups, "launcher");
  }
  function setDock(open) { dockPinned = open; document.body.classList.toggle("smriti-dock-open", open); }
  function setSearch(open) { searchPinned = open; document.body.classList.toggle("smriti-search-open", open); if(open) setTimeout(() => $("input[type=search]", search)?.focus(), 80); }
  function install(shellNode) {
    if (shell === shellNode) return;
    shell = shellNode; shell.classList.add("smriti-wallpaper-shell");
    search = $("form[role=search]", shell);
    dock = $('nav[aria-label="Dock"]', shell);
    quickLinks = $('section[aria-label="Adult link directory"]', shell);
    const triggers = [
      [button("Open Quick Links","smriti-quick-trigger"), "left"],
      [button("Show dock","smriti-dock-trigger"), "bottom"],
      [button("Show search","smriti-search-trigger"), "top"],
      [button("Settings and profile","smriti-settings-trigger"), "right"]
    ];
    const rightControls = document.createElement("div");
    rightControls.id = "smriti-right-controls";
    rightControls.setAttribute("aria-label", "Settings and profile");
    const settingsControl = button("Settings","smriti-settings-control","smriti-right-action");
    settingsControl.textContent = "⚙";
    settingsControl.addEventListener("click", () => $('button[aria-label="Open settings"]', shell)?.click());
    const profileControl = button("Profile","smriti-profile-control","smriti-right-action");
    profileControl.textContent = "●";
    profileControl.addEventListener("click", () => $('button[aria-label="Open profile"]', shell)?.click());
    rightControls.append(settingsControl, profileControl);
    document.body.append(rightControls);
    triggers.forEach(([el,edge]) => {
      el.textContent = edge === "left" ? "↗" : edge === "bottom" ? "⌃" : edge === "top" ? "⌄" : "⚙";
      document.body.append(el);
      el.addEventListener("click", () => {
        if(edge === "left") openQuickLinks();
        if(edge === "bottom") setDock(!document.body.classList.contains("smriti-dock-open"));
        if(edge === "top") setSearch(!document.body.classList.contains("smriti-search-open"));
        if(edge === "right") {
          $("#smriti-right-controls")?.classList.toggle("is-visible");
        }
      });
    });
    const dockTrigger = $("#smriti-dock-trigger");
    const dockNav = $('nav[aria-label="Dock"]', shell);
    const searchTrigger = $("#smriti-search-trigger");
    dockTrigger?.addEventListener("mouseenter", () => document.body.classList.add("smriti-dock-open"));
    dockNav?.addEventListener("mouseenter", () => document.body.classList.add("smriti-dock-open"));
    searchTrigger?.addEventListener("mouseenter", () => document.body.classList.add("smriti-search-open"));
    search?.addEventListener("mouseenter", () => document.body.classList.add("smriti-search-open"));
    const menu = button("Open app launcher","smriti-menu-button","smriti-launcher-menu"); menu.textContent = "▦ Menu";
    if (dockNav) dockNav.append(menu); else {
      menu.style.position="fixed"; menu.style.bottom="14px"; menu.style.left="50%"; menu.style.zIndex="140"; menu.style.transform="translateX(-50%)"; document.body.append(menu);
    }
    menu.addEventListener("click", openLauncher);
    const quickTrigger = $("#smriti-quick-trigger");
    quickTrigger?.addEventListener("mouseenter", () => quickTrigger.classList.add("is-visible"));
    ["left","bottom","top","right"].forEach(edge => {
      const el = triggers.find(([,name])=>name===edge)?.[0]; if(!el) return;
      const className = "smriti-edge-" + edge;
      el.addEventListener("mouseenter",()=>document.body.classList.add(className));
      el.addEventListener("mouseleave",()=>document.body.classList.remove(className));
    });
    const rightTrigger = $("#smriti-settings-trigger");
    rightTrigger?.addEventListener("mouseenter", () => $("#smriti-right-controls")?.classList.add("is-visible"));
    $("#smriti-right-controls")?.addEventListener("mouseenter", () => $("#smriti-right-controls")?.classList.add("is-visible"));
    document.addEventListener("keydown", e => { if(e.key === "Escape" && activeOverlay) closeOverlay(); });
    if (search) window.addEventListener("keydown", e => { if(e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); setSearch(true); } });
  }
  function revealZones() {
    const zones = [
      ["left","body.smriti-edge-left"],["bottom","body.smriti-edge-bottom"],["top","body.smriti-edge-top"],["right","body.smriti-edge-right"]
    ];
    zones.forEach(([edge]) => {
      const selector = edge === "left" ? "#smriti-quick-trigger" : edge === "bottom" ? "#smriti-dock-trigger" : edge === "top" ? "#smriti-search-trigger" : "#smriti-settings-trigger";
      const trigger = $(selector); if(!trigger) return;
      trigger.addEventListener("mouseenter",()=>trigger.classList.add("is-visible"));
      trigger.addEventListener("mouseleave",()=>trigger.classList.remove("is-visible"));
    });
  }
  const observer = new MutationObserver(() => {
    const root = $("#root > div");
    if (!root || root === shell) return;
    install(root); revealZones();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if ($("#root > div")) { install($("#root > div")); revealZones(); }
  document.addEventListener("pointermove", e => {
    if (e.pointerType === "touch" || activeOverlay) return;
    const w = window.innerWidth, h = window.innerHeight;
    const inside = el => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const quickTrigger = $("#smriti-quick-trigger");
    const dockTrigger = $("#smriti-dock-trigger");
    const searchTrigger = $("#smriti-search-trigger");
    const settingsTrigger = $("#smriti-settings-trigger");
    const rightControls = $("#smriti-right-controls");
    const left = e.clientX < 64 && e.clientY > h*.32 && e.clientY < h*.68;
    const bottom = e.clientY > h-36 && e.clientX > w*.35 && e.clientX < w*.65;
    const top = e.clientY < 36 && e.clientX > w*.35 && e.clientX < w*.65;
    const right = e.clientX > w-64 && e.clientY > h*.32 && e.clientY < h*.68;
    document.body.classList.toggle("smriti-edge-left", left);
    document.body.classList.toggle("smriti-edge-bottom", bottom);
    document.body.classList.toggle("smriti-edge-top", top);
    document.body.classList.toggle("smriti-edge-right", right);
    quickTrigger?.classList.toggle("is-visible", left || inside(quickTrigger));
    dockTrigger?.classList.toggle("is-visible", bottom || inside(dockTrigger));
    searchTrigger?.classList.toggle("is-visible", top || inside(searchTrigger));
    settingsTrigger?.classList.toggle("is-visible", right || inside(settingsTrigger));
    rightControls?.classList.toggle("is-visible", right || inside(settingsTrigger) || inside(rightControls));
    const overDock = inside(dockTrigger) || inside(dock);
    const overSearch = inside(searchTrigger) || inside(search);
    if (bottom || overDock) document.body.classList.add("smriti-dock-open");
    else if (!dockPinned) setDock(false);
    if (top || overSearch) document.body.classList.add("smriti-search-open");
    else if (!searchPinned) setSearch(false);
  });
  window.addEventListener("resize", () => { if(activeOverlay) closeOverlay(); });
})();