(() => {
  "use strict";

  const CONFIG = window.SITE_CONFIG || {};
  const PROJECTS = window.PROJECTS || [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* -----------------------------------------------------------
     WhatsApp links — one number, configured in config.js
     ----------------------------------------------------------- */
  const waNumber = String(CONFIG.whatsappNumber || "").replace(/\D/g, "");
  const waConfigured = waNumber.length >= 8;
  const waLink = (text) =>
    `https://wa.me/${waNumber}?text=${encodeURIComponent(text || CONFIG.whatsappMessage || "")}`;

  $$("[data-wa]").forEach((a) => {
    if (waConfigured) {
      a.href = waLink();
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.href = "#contact";
    }
  });
  $$("[data-wa-display]").forEach((el) => {
    if (CONFIG.whatsappDisplay) el.textContent = CONFIG.whatsappDisplay;
  });

  /* -----------------------------------------------------------
     Nav: glass on scroll, mobile menu, floating WhatsApp button
     ----------------------------------------------------------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const fab = $(".wa-fab");
  const hero = $(".hero");

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 20);
    if (fab) fab.classList.toggle("is-shown", y > hero.offsetHeight * 0.6);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------
     Scroll reveal
     ----------------------------------------------------------- */
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          revealIO.unobserve(en.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => revealIO.observe(el));

  /* -----------------------------------------------------------
     Capability cards: soft light follows the cursor
     ----------------------------------------------------------- */
  if (canHover) {
    $$(".cap").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* -----------------------------------------------------------
     About: text streams in left → right when scrolled into view
     ----------------------------------------------------------- */
  (function typing() {
    const root = $("#aboutText");
    if (!root) return;
    const tokens = [];

    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent.replace(/\s+/g, " ");
          const frag = document.createDocumentFragment();
          text.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const w = document.createElement("span");
            w.className = "w";
            for (const ch of part) {
              const c = document.createElement("span");
              c.className = "c";
              c.textContent = ch;
              w.appendChild(c);
              tokens.push(c);
            }
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.classList.contains("chip")) tokens.push(child);
          else walk(child);
        }
      });
    };
    walk(root);

    const showAll = () => tokens.forEach((t) => t.classList.add("on"));
    if (reduceMotion) return showAll();

    const CHARS_PER_SEC = 58;
    let started = false;

    const run = () => {
      started = true;
      let i = 0;
      let last = null;
      const t0 = performance.now();
      const step = (now) => {
        const target = Math.min(tokens.length, Math.floor(((now - t0) / 1000) * CHARS_PER_SEC));
        while (i < target) {
          const t = tokens[i++];
          t.classList.add("on");
          if (t.classList.contains("c")) {
            if (last) last.classList.remove("caret");
            t.classList.add("caret");
            last = t;
          }
        }
        if (i < tokens.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.45 }
    );
    io.observe(root);
  })();

  /* -----------------------------------------------------------
     Projects: curved rail that steps right every 2 seconds.
     Hover (or tap on touch) brings a card forward with details.
     ----------------------------------------------------------- */
  (function carousel() {
    const stage = $("#stage");
    if (!stage || !PROJECTS.length) return;

    const STEP_MS = 2000;
    const hint = $("#projectsHint");
    if (hint && !canHover) hint.textContent = "Tap a card to bring it forward.";
    const PALETTES = [
      ["#ff6a2b", "#d6249f", "#ffc93c"],
      ["#7c5cff", "#19c3a6", "#ff4fa3"],
      ["#ffc93c", "#ff4fa3", "#7c5cff"],
      ["#19c3a6", "#2a7bff", "#7dffd4"],
      ["#ff4fa3", "#ff6a2b", "#7c5cff"],
      ["#2a7bff", "#7c5cff", "#ffc93c"],
      ["#ff2e3e", "#ffc93c", "#d6249f"],
      ["#7dffd4", "#7c5cff", "#ff6a2b"],
    ];

    const esc = (s) =>
      String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
    const isPlaceholder = (p) => /^\[.*\]$/.test(String(p.name).trim());

    const cards = PROJECTS.map((p, i) => {
      const pal = PALETTES[i % PALETTES.length];
      const el = document.createElement("article");
      el.className = "pcard";
      el.tabIndex = 0;
      el.setAttribute("aria-label", `Project: ${p.name}`);
      el.style.setProperty("--c1", pal[0] + "cc");
      el.style.setProperty("--c2", pal[1] + "bb");
      el.style.setProperty("--c3", pal[2] + "66");
      el.style.setProperty("--glow", pal[0] + "88");
      const stack = (p.stack || []).map((t) => `<li>${esc(t)}</li>`).join("");
      const link = p.link
        ? `<a class="pcard__link" href="${esc(p.link)}" target="_blank" rel="noopener">View project <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg></a>`
        : "";
      el.innerHTML = `
        <div class="pcard__cover">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ""}</div>
        <div class="pcard__shade"></div>
        <span class="pcard__num">${String(i + 1).padStart(2, "0")}</span>
        <div class="pcard__body">
          ${isPlaceholder(p) ? `<span class="pcard__flag">Placeholder</span>` : ""}
          <h3 class="pcard__name">${esc(p.name)}</h3>
          <p class="pcard__tag">${esc(p.tagline)}</p>
          <div class="pcard__more"><div>
            <p class="pcard__label">Problem solved</p>
            <p class="pcard__problem">${esc(p.problem)}</p>
            <p class="pcard__label">Tech stack</p>
            <ul class="pcard__stack">${stack}</ul>
            ${link}
          </div></div>
        </div>`;
      stage.appendChild(el);
      return el;
    });

    const N = cards.length;
    let offset = 0;
    let slots = [];      // geometry for each visible slot, left → right
    let enterPos, exitPos;
    let V = 7;
    let focused = null;
    let timer = null;
    let inView = false;
    let leaveT = null;
    const prevSlot = new Array(N).fill(-1);

    function computeLayout() {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      V = W < 640 ? 3 : W < 1040 ? 5 : 7;
      V = Math.max(1, Math.min(V, N - 1));
      if (V % 2 === 0) V -= 1;
      const half = (V - 1) / 2 || 1;
      const maxRot = W < 640 ? 18 : 30;
      const gap = W < 640 ? 12 : 16;

      // Concave rail: small in the middle, larger and angled at the edges
      const raw = [];
      for (let s = 0; s < V; s++) {
        const d = s - (V - 1) / 2;
        const a = Math.abs(d) / half;
        raw.push({
          d, a,
          fw: 1 + 0.5 * a,               // width grows toward the edges
          fh: 1 + 0.36 * a * a + 0.1 * a, // height grows a little differently → shape changes
          ry: -Math.sign(d) * maxRot * a,
        });
      }
      const projSum = raw.reduce((t, r) => t + r.fw * Math.cos((r.ry * Math.PI) / 180), 0);
      // On phones the outer cards bleed off the edges so the centre card stays readable
      let wC = (W * (W < 640 ? 1.3 : 0.9) - gap * (V - 1)) / projSum;
      wC = Math.min(wC, W < 640 ? 150 : 200);
      let hC = wC * 1.6;
      const maxH = H * 0.82;
      const maxFh = Math.max(...raw.map((r) => r.fh));
      if (hC * maxFh > maxH) hC = maxH / maxFh;

      const widths = raw.map((r) => wC * r.fw);
      const proj = raw.map((r, i) => widths[i] * Math.cos((r.ry * Math.PI) / 180));
      const total = proj.reduce((a, b) => a + b, 0) + gap * (V - 1);
      let cursor = -total / 2;
      slots = raw.map((r, i) => {
        const x = cursor + proj[i] / 2;
        cursor += proj[i] + gap;
        return {
          x,
          w: widths[i],
          h: hC * r.fh,
          ry: r.ry,
          tz: r.a * r.a * (W < 640 ? 20 : 60),
          z: 10 + Math.round(r.a * 10),
        };
      });
      const first = slots[0];
      const last = slots[V - 1];
      enterPos = { ...first, x: first.x - first.w * 0.9 - gap, o: 0 };
      exitPos = { ...last, x: last.x + last.w * 0.9 + gap, o: 0 };
    }

    function setVars(el, g, extra = {}) {
      const o = extra.o ?? g.o ?? 1;
      el.style.setProperty("--x", `${(extra.x ?? g.x).toFixed(1)}px`);
      el.style.setProperty("--w", `${(extra.w ?? g.w).toFixed(1)}px`);
      el.style.setProperty("--h", `${(extra.h ?? g.h).toFixed(1)}px`);
      el.style.setProperty("--ry", `${(extra.ry ?? g.ry).toFixed(2)}deg`);
      el.style.setProperty("--tz", `${(extra.tz ?? g.tz).toFixed(1)}px`);
      el.style.setProperty("--o", o);
      el.style.setProperty("--b", extra.b ?? 1);
      el.style.zIndex = extra.zIndex ?? g.z ?? 1;
      el.style.pointerEvents = o === 0 ? "none" : "";
      el.setAttribute("aria-hidden", o === 0 ? "true" : "false");
      el.tabIndex = o === 0 ? -1 : 0;
    }

    function focusGeometry(g) {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const fw = Math.min(380, W * 0.86);
      const fh = Math.min(500, H * 0.94);
      const lim = W / 2 - fw / 2 - 12;
      return {
        x: Math.max(-lim, Math.min(lim, g.x)),
        w: fw,
        h: fh,
        ry: 0,
        tz: W < 640 ? 0 : 90,
        zIndex: 100,
      };
    }

    function render(animate = true) {
      const focusIdx = focused ? cards.indexOf(focused) : -1;
      const focusSlot = focusIdx >= 0 ? (focusIdx + offset) % N : -1;
      const focusX = focusSlot >= 0 && focusSlot < V ? focusGeometry(slots[focusSlot]).x : 0;

      cards.forEach((el, i) => {
        const s = (i + offset) % N;
        const visible = s < V;

        // A card wrapping round re-enters from the left edge, not by flying across
        if (animate && visible && s === 0 && prevSlot[i] !== 0 && prevSlot[i] !== -1) {
          el.classList.add("no-anim");
          setVars(el, enterPos);
          void el.offsetWidth;
          el.classList.remove("no-anim");
        }
        if (!animate) el.classList.add("no-anim");

        if (!visible) {
          setVars(el, exitPos);
        } else if (el === focused) {
          setVars(el, slots[s], focusGeometry(slots[s]));
        } else if (focused) {
          const g = slots[s];
          const push = g.x < focusX ? -60 : 60;
          setVars(el, g, { x: g.x + push, b: 0.42 });
        } else {
          setVars(el, slots[s]);
        }

        if (!animate) {
          void el.offsetWidth;
          el.classList.remove("no-anim");
        }
        prevSlot[i] = s;
      });
      stage.classList.toggle("has-focus", !!focused);
    }

    function advance() {
      offset = (offset + 1) % N;
      render(true);
    }

    function start() {
      if (timer || reduceMotion || focused || !inView || document.hidden) return;
      timer = setInterval(advance, STEP_MS);
    }
    function stop() {
      clearInterval(timer);
      timer = null;
    }

    function setFocus(el) {
      clearTimeout(leaveT);
      if (focused === el) return;
      cards.forEach((c) => c.classList.remove("is-focus"));
      focused = el;
      if (el) {
        el.classList.add("is-focus");
        stop();
      }
      render(true);
      if (!el) start();
    }

    // Pointer / keyboard interaction
    cards.forEach((el) => {
      if (canHover) {
        el.addEventListener("mouseenter", () => setFocus(el));
        el.addEventListener("mouseleave", () => {
          clearTimeout(leaveT);
          leaveT = setTimeout(() => setFocus(null), 160);
        });
      }
      el.addEventListener("click", (e) => {
        if (e.target.closest(".pcard__link")) return;
        if (focused !== el) setFocus(el);
        else if (!canHover) setFocus(null);
      });
      el.addEventListener("focus", () => setFocus(el));
      el.addEventListener("blur", (e) => {
        if (!el.contains(e.relatedTarget)) setFocus(null);
      });
    });
    document.addEventListener("click", (e) => {
      if (focused && !e.target.closest(".pcard")) setFocus(null);
    });

    // Only run while the section is on screen and the tab is visible
    new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        inView ? start() : stop();
      },
      { threshold: 0.25 }
    ).observe(stage);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    let rT;
    window.addEventListener("resize", () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        computeLayout();
        render(false);
      }, 120);
    });

    computeLayout();
    render(false);
  })();

  /* -----------------------------------------------------------
     Book a call form → Web3Forms (falls back to WhatsApp)
     ----------------------------------------------------------- */
  (function form() {
    const f = $("#bookForm");
    if (!f) return;
    const status = $("#formStatus");
    const btn = f.querySelector('button[type="submit"]');
    const label = btn.querySelector(".btn__label");
    const keyOk = CONFIG.web3formsKey && !/YOUR_/i.test(CONFIG.web3formsKey);

    const setStatus = (msg, cls = "") => {
      status.textContent = msg;
      status.className = `form-status ${cls}`;
    };

    f.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("is-invalid");
    });

    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (f.elements.botcheck.checked) return;

      let firstBad = null;
      ["name", "email", "phone", "requirement"].forEach((n) => {
        const input = f.elements[n];
        const ok = input.value.trim() && input.checkValidity();
        input.closest(".field").classList.toggle("is-invalid", !ok);
        if (!ok && !firstBad) firstBad = input;
      });
      if (firstBad) {
        setStatus("Please fill in all fields with valid details.", "err");
        firstBad.focus();
        return;
      }

      const data = {
        name: f.elements.name.value.trim(),
        email: f.elements.email.value.trim(),
        phone: f.elements.phone.value.trim(),
        requirement: f.elements.requirement.value.trim(),
      };

      if (!keyOk) {
        // No form backend configured yet: hand the request over via WhatsApp instead
        const msg = `Hi Ashwanth, I'd like to book a call.\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nRequirement: ${data.requirement}`;
        if (waConfigured) {
          window.open(waLink(msg), "_blank", "noopener");
          setStatus("Opening WhatsApp with your details…", "ok");
        } else {
          setStatus("Booking isn't configured yet — please check back soon.", "err");
        }
        return;
      }

      btn.disabled = true;
      label.textContent = "Sending…";
      setStatus("");
      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: CONFIG.web3formsKey,
            subject: `New call request from ${data.name}`,
            from_name: "Portfolio website",
            ...data,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || "Request failed");
        f.reset();
        setStatus("Thanks! I'll get back to you shortly to set up the call.", "ok");
      } catch (err) {
        setStatus("Something went wrong. Please message me on WhatsApp instead.", "err");
      } finally {
        btn.disabled = false;
        label.textContent = "Book a Call";
      }
    });
  })();
})();
