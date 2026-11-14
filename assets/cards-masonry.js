/* Resize-aware masonry packing for category cards. */
(() => {
  const selector = ".grid.w-full.grid-cols-2.gap-1\\.5.sm\\:grid-cols-4";
  const gap = 8;
  const unit = 4;
  let container = null;
  let raf = 0;
  const cardsObserved = new Set();

  const resizeObserver = new ResizeObserver(() => schedule());
  const mutationObserver = new MutationObserver(() => {
    const found = document.querySelector(selector);
    if (found !== container) attach(found);
    else schedule();
  });

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      pack();
    });
  }

  function attach(found) {
    if (container) resizeObserver.unobserve(container);
    for (const card of cardsObserved) resizeObserver.unobserve(card);
    cardsObserved.clear();
    container = found;
    if (!container) return;
    container.classList.add("smriti-masonry");
    resizeObserver.observe(container);
    schedule();
  }

  function pack() {
    if (!container || !container.isConnected) return;
    const cards = Array.from(container.children).filter((el) => el.matches("article"));
    for (const card of cardsObserved) {
      if (!cards.includes(card)) resizeObserver.unobserve(card);
    }
    cardsObserved.clear();

    const width = Math.max(1, container.clientWidth);
    const columns = Math.max(1, Math.floor((width + gap) / unit));
    const skyline = new Array(columns).fill(0);

    for (const card of cards) {
      card.classList.add("smriti-masonry-card");
      cardsObserved.add(card);
      resizeObserver.observe(card);

      const cardWidth = Math.min(width, Math.max(1, card.getBoundingClientRect().width || 220));
      const span = Math.min(columns, Math.max(1, Math.ceil((cardWidth + gap) / unit)));
      let bestColumn = 0;
      let bestTop = Infinity;

      for (let start = 0; start <= columns - span; start += 1) {
        let top = 0;
        for (let col = start; col < start + span; col += 1) top = Math.max(top, skyline[col]);
        if (top < bestTop) {
          bestTop = top;
          bestColumn = start;
        }
      }

      card.style.left = (bestColumn * unit) + "px";
      card.style.top = bestTop + "px";
      const bottom = bestTop + card.offsetHeight + gap;
      for (let col = bestColumn; col < bestColumn + span; col += 1) skyline[col] = bottom;
    }

    const height = Math.max(0, ...skyline);
    container.style.height = (height ? height - gap : 0) + "px";
  }

  function start() {
    const root = document.getElementById("root") || document.body;
    mutationObserver.observe(root, { childList: true, subtree: true });
    attach(document.querySelector(selector));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
  window.addEventListener("resize", schedule, { passive: true });
})();