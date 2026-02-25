(function () {
  const $ = (sel) => document.querySelector(sel);

  const stepTitle = $("#stepTitle");
  const stepLead = $("#stepLead");
  const optionsEl = $("#options");
  const contentEl = $("#content");
  const kickerEl = $("#kicker");
  const backBtn = $("#backBtn");
  const nextBtn = $("#nextBtn");
  const resetBtn = $("#resetBtn");
  const cartEl = $("#cart");
  const addAllBtn = $("#addAllBtn");
  const checkoutBtn = $("#checkoutBtn");
  const yearEl = $("#year");
  const progressBar = $("#progressBar");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const steps = window.STEPS || [];
  const products = window.PRODUCTS || {};
  const getPlan =
    window.getPlan ||
    function () {
      return { needed: [], stepsText: [], badges: [] };
    };

  const answers = {};
  const selected = new Map();
  let stepIndex = 0;

  // =========================================================
  // AUTO IFRAME HEIGHT (stable + anti-loop)
  // =========================================================
  const PARENT_ORIGIN = "https://www.lakopmaat.nl";
  let lastSent = 0;

  function measureHeight() {
    // Use layout height, not scrollHeight (prevents runaway loops)
    const el = document.getElementById("appRoot") || document.body;
    const rect = el.getBoundingClientRect();
    let h = Math.ceil(rect.height);

    // fallback
    if (!h || h < 300) {
      h = Math.ceil(
        Math.max(
          document.documentElement ? document.documentElement.clientHeight : 0,
          document.body ? document.body.clientHeight : 0
        )
      );
    }
    return h;
  }

  function clampHeight(h) {
    const isMobile = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
    const MIN = isMobile ? 750 : 650;
    const MAX = isMobile ? 2600 : 2200;
    if (h < MIN) h = MIN;
    if (h > MAX) h = MAX;
    return h;
  }

  function sendHeight(force) {
    try {
      if (!window.parent || window.parent === window) return;

      let h = clampHeight(measureHeight());

      // only send when changed enough (anti-loop)
      if (!force && Math.abs(h - lastSent) < 8) return;
      lastSent = h;

      window.parent.postMessage({ type: "LOM_IFRAME_HEIGHT", height: h }, PARENT_ORIGIN);
    } catch (e) {}
  }

  function bumpHeight() {
    setTimeout(() => sendHeight(false), 40);
    setTimeout(() => sendHeight(false), 200);
    setTimeout(() => sendHeight(false), 600);
  }

  window.addEventListener("load", function () {
    sendHeight(true);
    bumpHeight();
  });

  window.addEventListener("resize", function () {
    bumpHeight();
  });

  // ResizeObserver: still useful, but guarded by anti-loop logic above
  try {
    const ro = new ResizeObserver(function () {
      sendHeight(false);
    });
    ro.observe(document.documentElement);
  } catch (e) {}

  // =========================================================
  // HELPERS
  // =========================================================
  function setAnswer(stepId, value) {
    answers[stepId] = value;
  }

  function isStepComplete(idx) {
    const step = steps[idx];
    if (!step) return false;
    if (step.id === "products" || step.id === "done") return true;
    return !!answers[step.id];
  }

  function renderProgress() {
    if (!progressBar) return;
    const pct = Math.round((stepIndex / Math.max(1, steps.length - 1)) * 100);
    progressBar.style.width = pct + "%";
  }

  function toggleProduct(pid, on) {
    const p = products[pid];
    if (!p) return;
    if (on) {
      const cur = selected.get(pid);
      selected.set(pid, { ...p, qty: (cur && cur.qty) ? cur.qty : (p.defaultQty || 1) });
    } else {
      selected.delete(pid);
    }
    renderCart();
    bumpHeight();
  }

  function setQty(pid, qty) {
    const it = selected.get(pid);
    if (!it) return;
    const n = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    selected.set(pid, { ...it, qty: n });
    renderCart();
    bumpHeight();
  }

  // =========================================================
  // RENDER OPTIONS
  // =========================================================
  function renderOptions(step) {
    optionsEl.innerHTML = "";
    const opts = (step && step.options) ? step.options : [];
    optionsEl.style.display = opts.length ? "grid" : "none";

    opts.forEach((opt) => {
      const div = document.createElement("div");
      const active = answers[step.id] === opt.value;
      div.className = "opt" + (active ? " opt--active" : "");
      div.innerHTML =
        '<div class="opt__title">' + (opt.title || "") + "</div>" +
        '<div class="opt__sub">' + (opt.sub || "") + "</div>";

      div.addEventListener("click", function () {
        setAnswer(step.id, opt.value);
        render();
      });

      optionsEl.appendChild(div);
    });
  }

  // =========================================================
  // RENDER CONTENT
  // =========================================================
  function renderContent(step) {
    contentEl.innerHTML = "";
    if (!step) return;
    if (step.id !== "products" && step.id !== "done") return;

    const plan = getPlan(answers);

    // Overzicht
    const block1 = document.createElement("div");
    block1.className = "block";
    block1.innerHTML =
      '<div class="block__title">Overzicht</div>' +
      '<p class="p">Jouw keuzes bepalen de aanpak en de productlijst.</p>' +
      '<div class="badges">' +
      (plan.badges || []).map((b) => '<span class="badge">' + b + "</span>").join("") +
      "</div>";
    contentEl.appendChild(block1);

    // PRODUCTS: split
    if (step.id === "products") {
      const split = document.createElement("div");
      split.className = "products-split";

      // links
      const block2 = document.createElement("div");
      block2.className = "block";
      block2.innerHTML = '<div class="block__title">Stappenplan</div>';
      (plan.stepsText || []).forEach((s) => {
        const p = document.createElement("p");
        p.className = "p";
        p.style.marginTop = "8px";
        p.innerHTML =
          '<strong style="color:var(--text)">' + (s.title || "") + "</strong><br>" +
          (s.text || "");
        block2.appendChild(p);
      });

      // rechts
      const block3 = document.createElement("div");
      block3.className = "block";
      block3.innerHTML = '<div class="block__title">Aanbevolen producten</div>';

      (plan.needed || []).forEach((p) => {
  // default select (zoals je al had)
  if (!selected.has(p.id)) selected.set(p.id, { ...p, qty: p.qty || p.defaultQty || 1 });

  const checked = selected.has(p.id);
  const currentQty =
    (selected.get(p.id) && selected.get(p.id).qty) ? selected.get(p.id).qty : 1;

  const row = document.createElement("div");
  row.className = "prod" + (checked ? " prod--selected" : "");

  row.innerHTML = `
    <div class="prod__left">
      <input class="chk" type="checkbox" ${checked ? "checked" : ""} aria-label="Selecteer ${p.name}">
      <div>
        <div class="prod__name">${p.name || ""}</div>
        <div class="prod__why">${p.why || ""}</div>
        <div class="badges"><span class="badge">${p.tag || "Product"}</span></div>
      </div>
    </div>
    <input class="qty" type="number" min="1" max="99" value="${currentQty}" aria-label="Aantal">
  `;

  const chk = row.querySelector(".chk");
  chk.addEventListener("change", (e) => {
    toggleProduct(p.id, e.target.checked);
    row.classList.toggle("prod--selected", !!e.target.checked);
  });

  row.querySelector(".qty").addEventListener("change", (e) => setQty(p.id, e.target.value));

  block3.appendChild(row);
});

      split.appendChild(block2);
      split.appendChild(block3);
      contentEl.appendChild(split);

      renderCart();
      bumpHeight();
      return;
    }

    // DONE
    if (step.id === "done") {
      const blockDone = document.createElement("div");
      blockDone.className = "block";
      blockDone.innerHTML =
        '<div class="block__title">Check je lijst</div>' +
        '<p class="p">Controleer rechts je producten en aantallen. Klik daarna op "Alles toevoegen" of "Afrekenen".</p>';
      contentEl.appendChild(blockDone);

      renderCart();
      bumpHeight();
      return;
    }
  }

  // =========================================================
  // CART
  // =========================================================
  function renderCart() {
    cartEl.innerHTML = "";
    const items = Array.from(selected.values());

    if (!items.length) {
      cartEl.innerHTML = '<div class="muted">Nog geen producten gekozen.</div>';
      return;
    }

    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "cartitem";
      row.innerHTML = `
        <div>
          <div class="cartitem__name">${it.name || ""}</div>
          <div class="cartitem__meta">${it.tag || "Product"} • Aantal: ${it.qty || 1}</div>
        </div>
        <div class="cartitem__right">
          <input class="qty" style="width:64px" type="number" min="1" max="99" value="${it.qty || 1}" aria-label="Aantal ${it.name || ""}">
          <button class="iconbtn" type="button" title="Verwijderen">×</button>
        </div>
      `;

      row.querySelector("input").addEventListener("change", (e) => setQty(it.id, e.target.value));
      row.querySelector("button").addEventListener("click", () => {
        selected.delete(it.id);
        renderCart();
        bumpHeight();
      });

      cartEl.appendChild(row);
    });
  }

  // =========================================================
  // MAIN RENDER
  // =========================================================
  function render() {
    const step = steps[stepIndex];
    if (!step) return;

    kickerEl.textContent = "Stap " + (stepIndex + 1) + " van " + steps.length;
    stepTitle.textContent = step.title || "—";
    stepLead.textContent = step.lead || "";

    renderOptions(step);
    renderContent(step);

    backBtn.disabled = stepIndex === 0;

    if (step.id === "products") {
      nextBtn.textContent = "Naar afronden →";
      nextBtn.disabled = false;
    } else if (step.id === "done") {
      nextBtn.textContent = "Klaar";
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = "Volgende →";
      nextBtn.disabled = !isStepComplete(stepIndex);
    }

    renderProgress();
    bumpHeight();
  }

  function next() {
    if (!isStepComplete(stepIndex)) return;
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      bumpHeight();
    }
  }

  function back() {
    if (stepIndex > 0) {
      stepIndex--;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      bumpHeight();
    }
  }

  function resetAll() {
    Object.keys(answers).forEach((k) => delete answers[k]);
    selected.clear();
    stepIndex = 0;
    render();
  }

  // =========================================================
  // EVENTS
  // =========================================================
  backBtn.addEventListener("click", back);
  nextBtn.addEventListener("click", next);
  resetBtn.addEventListener("click", resetAll);

  addAllBtn.addEventListener("click", async () => {
    const items = Array.from(selected.values());
    if (!items.length) return alert("Kies eerst producten.");
    try {
      await window.CartAPI.addAll(items);
      alert("Toegevoegd aan winkelwagen.");
    } catch (err) {
      alert(String(err && err.message ? err.message : err));
    }
  });

  checkoutBtn.addEventListener("click", async () => {
    const items = Array.from(selected.values());
    if (!items.length) return alert("Kies eerst producten.");
    try {
      await window.CartAPI.addAll(items);
      window.CartAPI.goCheckout();
    } catch (err) {
      alert(String(err && err.message ? err.message : err));
    }
  });

  render();
  bumpHeight();
})();
