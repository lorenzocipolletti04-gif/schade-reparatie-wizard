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
  const getPlan = window.getPlan || function () {
    return { needed: [], stepsText: [], badges: [] };
  };

  const answers = {};
  const selected = new Map(); // productId -> { ...product, qty }

  let stepIndex = 0;

  // ---------- IFRAME HEIGHT SYNC ----------
  const PARENT_ORIGIN = "https://www.lakopmaat.nl";

  function postHeight() {
    try {
      const h =
        document.documentElement.scrollHeight ||
        document.body.scrollHeight ||
        900;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: "LOM_IFRAME_HEIGHT", height: h },
          PARENT_ORIGIN
        );
      }
    } catch (e) {}
  }

  function scheduleHeight() {
    setTimeout(postHeight, 30);
    setTimeout(postHeight, 200);
  }

  window.addEventListener("resize", function () {
    scheduleHeight();
  });

  // ---------- HELPERS ----------
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
      selected.set(pid, {
        ...p,
        qty: (cur && cur.qty) ? cur.qty : (p.defaultQty || 1),
      });
    } else {
      selected.delete(pid);
    }
    renderCart();
    scheduleHeight();
  }

  function setQty(pid, qty) {
    const it = selected.get(pid);
    if (!it) return;
    const n = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    selected.set(pid, { ...it, qty: n });
    renderCart();
    scheduleHeight();
  }

  // ---------- RENDER OPTIONS ----------
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

  // ---------- RENDER CONTENT ----------
  function renderContent(step) {
    contentEl.innerHTML = "";

    if (!step) return;
    if (step.id !== "products" && step.id !== "done") return;

    const plan = getPlan(answers);

    // Overzicht block (badges)
    const block1 = document.createElement("div");
    block1.className = "block";
    block1.innerHTML =
      '<div class="block__title">Overzicht</div>' +
      '<p class="p">Jouw keuzes bepalen de aanpak en de productlijst.</p>' +
      '<div class="badges">' +
      (plan.badges || []).map((b) => '<span class="badge">' + b + "</span>").join("") +
      "</div>";
    contentEl.appendChild(block1);

    // PRODUCTS step: split layout
    if (step.id === "products") {
      const split = document.createElement("div");
      split.className = "products-split";

      // LINKS: stappenplan
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

      // RECHTS: aanbevolen producten
      const block3 = document.createElement("div");
      block3.className = "block";
      block3.innerHTML = '<div class="block__title">Aanbevolen producten</div>';

      (plan.needed || []).forEach((p) => {
        // auto-select defaults (maar respecteer user keuzes)
        if (!selected.has(p.id)) {
          selected.set(p.id, { ...p, qty: p.qty || p.defaultQty || 1 });
        }

        const row = document.createElement("div");
        row.className = "prod";

        const checked = selected.has(p.id);
        const currentQty = (selected.get(p.id) && selected.get(p.id).qty) ? selected.get(p.id).qty : 1;

        row.innerHTML =
          '<div class="prod__left">' +
            '<input class="chk" type="checkbox" ' + (checked ? "checked" : "") + ' aria-label="Selecteer ' + (p.name || "") + '">' +
            "<div>" +
              '<div class="prod__name">' + (p.name || "") + "</div>" +
              '<div class="prod__why">' + (p.why || "") + "</div>" +
              '<div class="badges"><span class="badge">' + (p.tag || "Product") + "</span></div>" +
            "</div>" +
          "</div>" +
          '<input class="qty" type="number" min="1" max="99" value="' + currentQty + '" aria-label="Aantal">';

        const chk = row.querySelector(".chk");
        const qty = row.querySelector(".qty");

        chk.addEventListener("change", (e) => toggleProduct(p.id, e.target.checked));
        qty.addEventListener("change", (e) => setQty(p.id, e.target.value));

        block3.appendChild(row);
      });

      split.appendChild(block2);
      split.appendChild(block3);
      contentEl.appendChild(split);

      renderCart();
      scheduleHeight();
      return; // belangrijk: voorkom dat er nog iets onderaan dubbel rendert
    }

    // DONE step: toon een korte samenvatting + reminder
    if (step.id === "done") {
      const blockDone = document.createElement("div");
      blockDone.className = "block";
      blockDone.innerHTML =
        '<div class="block__title">Check je lijst</div>' +
        '<p class="p">Controleer rechts je producten en aantallen. Klik daarna op "Alles toevoegen" of "Afrekenen".</p>';
      contentEl.appendChild(blockDone);

      renderCart();
      scheduleHeight();
      return;
    }
  }

  // ---------- CART RENDER ----------
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
      row.innerHTML =
        "<div>" +
          '<div class="cartitem__name">' + (it.name || "") + "</div>" +
          '<div class="cartitem__meta">' + (it.tag || "Product") + " • Aantal: " + (it.qty || 1) + "</div>" +
        "</div>" +
        '<div class="cartitem__right">' +
          '<input class="qty" style="width:64px" type="number" min="1" max="99" value="' + (it.qty || 1) + '" aria-label="Aantal ' + (it.name || "") + '">' +
          '<button class="iconbtn" type="button" title="Verwijderen">×</button>' +
        "</div>";

      const qty = row.querySelector("input");
      const del = row.querySelector("button");

      qty.addEventListener("change", (e) => setQty(it.id, e.target.value));
      del.addEventListener("click", () => {
        selected.delete(it.id);
        renderCart();
        scheduleHeight();
      });

      cartEl.appendChild(row);
    });
  }

  // ---------- MAIN RENDER ----------
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
    scheduleHeight();
  }

  // ---------- NAV ----------
  function next() {
    if (!isStepComplete(stepIndex)) return;
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    if (stepIndex > 0) {
      stepIndex--;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function resetAll() {
    Object.keys(answers).forEach((k) => delete answers[k]);
    selected.clear();
    stepIndex = 0;
    render();
  }

  // ---------- EVENTS ----------
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
      alert(String((err && err.message) ? err.message : err));
    }
  });

  checkoutBtn.addEventListener("click", async () => {
    const items = Array.from(selected.values());
    if (!items.length) return alert("Kies eerst producten.");
    try {
      await window.CartAPI.addAll(items);
      window.CartAPI.goCheckout();
    } catch (err) {
      alert(String((err && err.message) ? err.message : err));
    }
  });

  // initial
  render();
  scheduleHeight();
})();
