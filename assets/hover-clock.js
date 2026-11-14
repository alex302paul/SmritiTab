(() => {
  "use strict";

  const ROOT_ID = "smrititab-hover-clock";

  function initHoverClock() {
    if (document.getElementById(ROOT_ID) || !document.body) return;

    const style = document.createElement("style");
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        z-index: 10000;
        inset: 50% auto auto 50%;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        width: min(92vw, 560px);
        min-height: 205px;
        display: grid;
        place-items: center;
        padding: 24px 30px;
        color: #fff;
        text-align: center;
        background: rgba(15, 23, 42, .32);
        border: 1px solid rgba(249, 115, 22, .42);
        border-radius: 24px;
        outline: none;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 8px 28px rgba(0, 0, 0, .16);
        cursor: default;
        -webkit-tap-highlight-color: transparent;
        transition: border-color 220ms ease, background 220ms ease, box-shadow 220ms ease;
      }
      #${ROOT_ID}:hover,
      #${ROOT_ID}:focus-visible,
      #${ROOT_ID}.is-tapped {
        background: rgba(15, 23, 42, .58);
        border-color: rgba(249, 115, 22, .9);
        box-shadow: 0 10px 32px rgba(0, 0, 0, .24), 0 0 14px rgba(249, 115, 22, .12);
      }
      #${ROOT_ID} .smrititab-clock-content {
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 260ms ease, transform 260ms ease;
        pointer-events: none;
        user-select: none;
      }
      #${ROOT_ID}:hover .smrititab-clock-content,
      #${ROOT_ID}:focus-visible .smrititab-clock-content,
      #${ROOT_ID}.is-tapped .smrititab-clock-content {
        opacity: 1;
        transform: translateY(0);
      }
      #${ROOT_ID} .smrititab-clock-time,
      #${ROOT_ID} .smrititab-clock-greeting,
      #${ROOT_ID} .smrititab-clock-date {
        color: #fff;
        -webkit-text-fill-color: #fff;
        -webkit-text-stroke: .7px #f97316;
        paint-order: stroke fill;
        text-shadow: 0 2px 5px rgba(0, 0, 0, .28);
      }
      #${ROOT_ID} .smrititab-clock-time {
        margin: 0;
        font: 800 clamp(2.8rem, 8vw, 5.6rem)/1.05 "Poppins", sans-serif;
        letter-spacing: -.045em;
        font-variant-numeric: tabular-nums;
        -webkit-text-stroke: 1.1px #f97316;
      }
      #${ROOT_ID} .smrititab-clock-greeting {
        margin: 12px 0 0;
        font: 800 clamp(1rem, 2.4vw, 1.4rem)/1.35 "Poppins", sans-serif;
        letter-spacing: .01em;
      }
      #${ROOT_ID} .smrititab-clock-date {
        margin: 5px 0 0;
        font: 700 clamp(.82rem, 1.8vw, 1rem)/1.4 "Poppins", sans-serif;
        letter-spacing: .02em;
      }
      @media (hover: none) {
        #${ROOT_ID} { min-height: 220px; cursor: pointer; }
      }
      @media (prefers-reduced-motion: reduce) {
        #${ROOT_ID}, #${ROOT_ID} .smrititab-clock-content {
          transition: none;
          transform: translate(-50%, -50%);
        }
        #${ROOT_ID} .smrititab-clock-content { transform: none; }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.tabIndex = 0;
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Hover or tap to show the clock, greeting and date");
    root.innerHTML = `
      <div class="smrititab-clock-content" aria-live="off">
        <p class="smrititab-clock-time"></p>
        <p class="smrititab-clock-greeting"></p>
        <p class="smrititab-clock-date"></p>
      </div>
    `;
    document.body.appendChild(root);

    const timeNode = root.querySelector(".smrititab-clock-time");
    const greetingNode = root.querySelector(".smrititab-clock-greeting");
    const dateNode = root.querySelector(".smrititab-clock-date");

    function greetingFor(hour) {
      if (hour >= 5 && hour < 12) return "Good Morning!";
      if (hour >= 12 && hour < 17) return "Good Afternoon!";
      if (hour >= 17 && hour < 21) return "Good Evening!";
      return "Good Night!";
    }

    function updateClock() {
      const now = new Date();
      timeNode.textContent = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(now);
      greetingNode.textContent = greetingFor(now.getHours());
      dateNode.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(now);
    }

    root.addEventListener("click", () => {
      if (window.matchMedia("(hover: none)").matches) {
        root.classList.toggle("is-tapped");
      }
    });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        root.classList.remove("is-tapped");
        root.blur();
      }
    });

    updateClock();
    window.setInterval(updateClock, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHoverClock, { once: true });
  } else {
    initHoverClock();
  }
})();