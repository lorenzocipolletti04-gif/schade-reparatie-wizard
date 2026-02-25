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
  const sidebarRoot = $("#sidebarRoot");

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
  // AUTO IFRAME HEIGHT (no scroll-growth)
  // - Uses document height, debounced
  // - Sends both SRW_IFRAME_HEIGHT (older) and LOM_IFRAME_HEIGHT (newer)
  // =========================================================
  const PARENT_ORIGIN = "*";
  let lastSent = 0;

  function getDocHeight() {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.clientHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0
    );
  }

  function sendHeight(force) {
    try {
      if (!window.parent || window.parent === window) return;
      const h = Math.max(320, Math.min(getDocHeight() + 8, 4000));
      if (!force && Math.abs(h - lastSent) < 2) return;
      lastSent = h;

      window.parent.postMessage({ type: "SRW_IFRAME_HEIGHT", height: h }, PARENT_ORIGIN);
      window.parent.postMessage({ type: "LOM_IFRAME_HEIGHT", height: h }, PARENT_ORIGIN);
    } catch (e) {}
  }

  function bumpHeight() {
    setTimeout(() => sendHeight(false), 50);
    setTimeout(() => sendHeight(false), 220);
  }

  window.addEventListener("load", function () {
    sendHeight(true);
    bumpHeight();
  });

  window.addEventListener("resize", function () {
    bumpHeight();
  });

  try {
    const mo = new MutationObserver(function () {
      requestAnimationFrame(() => sendHeight(false));
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  } catch (e) {}
// =========================================================
  // MOBILE DRAWER UI (cart)
  // =========================================================
  let backdropEl = null;
  let cartToggleBtn = null;

  function isMobileDrawer() {
    return window.matchMedia && window.matchMedia("(max-width: 980px)").matches;
  }

  function ensureDrawerUI() {
    if (!sidebarRoot) return;

    if (!backdropEl) {
      backdropEl = document.createElement("div");
      backdropEl.className = "drawer-backdrop";
      backdropEl.addEventListener("click", () => setDrawerOpen(false));
      document.body.appendChild(backdropEl);
    }

    if (!cartToggleBtn) {
      cartToggleBtn = document.createElement("button");
      cartToggleBtn.type = "button";
      cartToggleBtn.className = "cart-toggle";
      cartToggleBtn.innerHTML = `
        <span>Jouw lijst</span>
        <span class="cart-toggle__count" id="cartToggleCount">0</span>
      `;
      cartToggleBtn.addEventListener("click", () => setDrawerOpen(true));
      document.body.appendChild(cartToggleBtn);
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    });

    window.addEventListener("resize", () => {
      if (!isMobileDrawer()) setDrawerOpen(false);
    });
  }

  function setDrawerOpen(open) {
    if (!sidebarRoot) return;
    if (!isMobileDrawer()) {
      document.body.classList.remove("drawer-open");
      return;
    }
    document.body.classList.toggle("drawer-open", !!open);
    bumpHeight();
  }

  function updateCartToggleCount() {
    if (!cartToggleBtn) return;
    const countEl = cartToggleBtn.querySelector("#cartToggleCount");
    if (countEl) countEl.textContent = String(selected.size);
  }

  ensureDrawerUI();

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

    // ✅ best UX: on mobile, open drawer when user adds something
    if (on && isMobileDrawer()) setDrawerOpen(true);

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
      (plan.badges || []).filter(Boolean).map((b) => '<span class="badge">' + b + "</span>").join("") +
      "</div>";
    contentEl.appendChild(block1);

    // PRODUCTS: split
    if (step.id === "products") {
      const split = document.createElement("div");
      split.className = "products-split";

      // Stappenplan
      const block2 = document.createElement("div");
      block2.className = "block";
      block2.innerHTML = '<div class="block__title">Stappenplan</div>';

      const ul = document.createElement("ul");
      (plan.stepsText || []).forEach((s) => {
        const li = document.createElement("li");
        const title = (s && s.title) ? s.title : "";
        const text = (s && s.text) ? s.text : "";
        li.innerHTML = "<strong>" + title + "</strong><br>" + text;
        ul.appendChild(li);
      });
      block2.appendChild(ul);

      // Producten
      const block3 = document.createElement("div");
      block3.className = "block";
      block3.innerHTML = '<div class="block__title">Aanbevolen producten</div>';

      (plan.needed || []).forEach((p) => {
        if (!p || !p.id) return;

        // default select (as before)
        if (!selected.has(p.id)) selected.set(p.id, { ...p, qty: p.qty || p.defaultQty || 1 });

        const checked = selected.has(p.id);
        const currentQty = (selected.get(p.id) && selected.get(p.id).qty) ? selected.get(p.id).qty : 1;

        const row = document.createElement("div");
        row.className = "prod" + (checked ? " prod--selected" : "");

        row.innerHTML = `
          <div class="prod__left">
            <input class="chk" type="checkbox" ${checked ? "checked" : ""} aria-label="Selecteer ${p.name || ""}">
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
        '<p class="p">Controleer je producten en aantallen. Op mobiel vind je "Jouw lijst" onderin via de knop.</p>';
      contentEl.appendChild(blockDone);

      renderCart();
      bumpHeight();
      return;
    }
  }

  // =========================================================
  // CART (mini-table + subtotals)
  // =========================================================
  function formatMoneyEUR(amount) {
    try {
      return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
    } catch (e) {
      return "€ " + (Math.round(amount * 100) / 100).toFixed(2);
    }
  }

  function renderCart() {
    cartEl.innerHTML = "";
    const items = Array.from(selected.values());

    updateCartToggleCount();

    if (!items.length) {
      cartEl.innerHTML = '<div class="muted">Nog geen producten gekozen.</div>';
      return;
    }

    const table = document.createElement("div");
    table.className = "carttable";

    const hasPrices = items.some((it) => typeof it.price === "number" && isFinite(it.price));
    let subtotal = 0;

    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "cartrow";

      const qty = it.qty || 1;
      if (hasPrices && typeof it.price === "number") subtotal += it.price * qty;

      row.innerHTML = `
        <div>
          <div class="cartrow__name">${it.name || ""}</div>
          <div class="cartrow__meta">${it.tag || "Product"}</div>
        </div>
        <input class="qty" type="number" min="1" max="99" value="${qty}" aria-label="Aantal ${it.name || ""}">
        <button class="iconbtn" type="button" title="Verwijderen">×</button>
      `;

      row.querySelector("input").addEventListener("change", (e) => setQty(it.id, e.target.value));
      row.querySelector("button").addEventListener("click", () => {
        selected.delete(it.id);
        renderCart();
        bumpHeight();
      });

      table.appendChild(row);
    });

    cartEl.appendChild(table);

    // Totals box
    const totals = document.createElement("div");
    totals.className = "carttotals";

    if (!hasPrices) {
      totals.innerHTML = `
        <div class="line line--muted"><span>Subtotaal</span><span>—</span></div>
        <div class="line line--muted"><span>Verzendkosten</span><span>—</span></div>
        <div class="hr"></div>
        <div class="line line--total"><span>Totaal</span><span>—</span></div>
        <div class="muted" style="margin-top:6px">Tip: voeg later per product een <b>price</b> toe in <code>data.js</code> voor echte subtotalen.</div>
      `;
    } else {
      const shipping = 0;
      const total = subtotal + shipping;
      totals.innerHTML = `
        <div class="line"><span>Subtotaal</span><span>${formatMoneyEUR(subtotal)}</span></div>
        <div class="line line--muted"><span>Verzendkosten</span><span>${shipping ? formatMoneyEUR(shipping) : "—"}</span></div>
        <div class="hr"></div>
        <div class="line line--total"><span>Totaal</span><span>${formatMoneyEUR(total)}</span></div>
      `;
    }

    cartEl.appendChild(totals);
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
    setDrawerOpen(false);
    render();
    renderCart();
    bumpHeight();
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
      if (isMobileDrawer()) setDrawerOpen(false);
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
  renderCart();
  bumpHeight();
})();
