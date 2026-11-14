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
      [button("Open settings and profile","smriti-settings-trigger"), "right"]
    ];
    triggers.forEach(([el,edge]) => {
      el.textContent = edge === "left" ? "↗" : edge === "bottom" ? "⌃" : edge === "top" ? "⌄" : "⚙";
      document.body.append(el);
      el.addEventListener("click", () => {
        if(edge === "left") openQuickLinks();
        if(edge === "bottom") setDock(!document.body.classList.contains("smriti-dock-open"));
        if(edge === "top") setSearch(!document.body.classList.contains("smriti-search-open"));
        if(edge === "right") {
          const settings = $('button[aria-label="Open settings"]', shell);
          if(settings) settings.click();
          else { const profile = $('button[aria-label="Open profile"]', shell); profile?.click(); }
        }
      });
    });
    const dockTrigger = $("#smriti-dock-trigger");
    const dockNav = $('nav[aria-label="Dock"]', shell);
    dockTrigger?.addEventListener("mouseenter", () => setDock(true));
    dockNav?.addEventListener("mouseenter", () => setDock(true));
    dockNav?.addEventListener("mouseleave", () => { if(!dockPinned) setDock(false); });
    const searchTrigger = $("#smriti-search-trigger");
    searchTrigger?.addEventListener("mouseenter", () => setSearch(true));
    search?.addEventListener("mouseleave", () => { if(!searchPinned) setSearch(false); });
    searchTrigger?.addEventListener("mouseleave", () => { if(!searchPinned) setSearch(false); });
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
    const w=window.innerWidth,h=window.innerHeight;
    document.body.classList.toggle("smriti-edge-left", e.clientX < 12 && e.clientY > h*.32 && e.clientY < h*.68);
    document.body.classList.toggle("smriti-edge-bottom", e.clientY > h-10 && e.clientX > w*.35 && e.clientX < w*.65);
    document.body.classList.toggle("smriti-edge-top", e.clientY < 10 && e.clientX > w*.35 && e.clientX < w*.65);
    document.body.classList.toggle("smriti-edge-right", e.clientX > w-10 && e.clientY > h*.32 && e.clientY < h*.68);
    [["left","#smriti-quick-trigger"],["bottom","#smriti-dock-trigger"],["top","#smriti-search-trigger"],["right","#smriti-settings-trigger"]].forEach(([edge,sel])=>$(sel)?.classList.toggle("is-visible",document.body.classList.contains("smriti-edge-"+edge)));
    if (!document.body.classList.contains("smriti-edge-bottom") && !dockPinned && !dock?.matches(":hover")) setDock(false);
    if (!document.body.classList.contains("smriti-edge-top") && !searchPinned && !search?.matches(":hover")) setSearch(false);
  });
  window.addEventListener("resize", () => { if(activeOverlay) closeOverlay(); });
})();