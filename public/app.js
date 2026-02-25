(function(){
  const $ = (sel) => document.querySelector(sel);

  const stepTitle = $("#stepTitle");
  const stepLead  = $("#stepLead");
  const optionsEl = $("#options");
  const contentEl = $("#content");
  const kickerEl  = $("#kicker");
  const backBtn   = $("#backBtn");
  const nextBtn   = $("#nextBtn");
  const resetBtn  = $("#resetBtn");
  const cartEl    = $("#cart");
  const addAllBtn = $("#addAllBtn");
  const checkoutBtn = $("#checkoutBtn");
  const yearEl    = $("#year");
  const progressBar = $("#progressBar");

  yearEl.textContent = new Date().getFullYear();

  const steps = window.STEPS;
  const products = window.PRODUCTS;

  const answers = {};
  const selected = new Map(); // productId -> { ...product, qty }

  let stepIndex = 0;

  function setAnswer(stepId, value){
    answers[stepId] = value;
  }

  function isStepComplete(idx){
    const step = steps[idx];
    if(step.id === "products" || step.id === "done") return true;
    return !!answers[step.id];
  }

  function renderProgress(){
    const pct = Math.round((stepIndex) / (steps.length - 1) * 100);
    progressBar.style.width = `${pct}%`;
  }

  function renderOptions(step){
    optionsEl.innerHTML = "";
    const opts = step.options || [];
    optionsEl.style.display = opts.length ? "grid" : "none";

    opts.forEach(opt => {
      const div = document.createElement("div");
      div.className = "opt" + ((answers[step.id] === opt.value) ? " opt--active" : "");
      div.innerHTML = `
        <div class="opt__title">${opt.title}</div>
        <div class="opt__sub">${opt.sub || ""}</div>
      `;
      div.addEventListener("click", () => {
        setAnswer(step.id, opt.value);
        render();
      });
      optionsEl.appendChild(div);
    });
  }

  function toggleProduct(pid, on){
    const p = products[pid];
    if(!p) return;
    if(on){
      selected.set(pid, { ...p, qty: selected.get(pid)?.qty || p.defaultQty || 1 });
    } else {
      selected.delete(pid);
    }
    renderCart();
  }

  function setQty(pid, qty){
    const it = selected.get(pid);
    if(!it) return;
    const n = Math.max(1, Math.min(99, parseInt(qty,10) || 1));
    selected.set(pid, { ...it, qty: n });
    renderCart();
  }

  function renderContent(step){
    contentEl.innerHTML = "";

    if(step.id === "products"){
  const split = document.createElement("div");
  split.className = "products-split";

  // stappenplan (links)
  const block2 = document.createElement("div");
  block2.className = "block";
  block2.innerHTML = `<div class="block__title">Stappenplan</div>`;
  plan.stepsText.forEach(s=>{
    const p = document.createElement("p");
    p.className = "p";
    p.style.marginTop = "8px";
    p.innerHTML = `<strong style="color:var(--text)">${s.title}</strong><br>${s.text}`;
    block2.appendChild(p);
  });

  // producten (rechts)
  const block3 = document.createElement("div");
  block3.className = "block";
  block3.innerHTML = `<div class="block__title">Aanbevolen producten</div>`;
  plan.needed.forEach(p=>{
    if(!selected.has(p.id)) selected.set(p.id, { ...p, qty: p.qty || p.defaultQty || 1 });

    const row = document.createElement("div");
    row.className = "prod";
    const checked = selected.has(p.id);
    row.innerHTML = `
      <div class="prod__left">
        <input class="chk" type="checkbox" ${checked ? "checked":""} aria-label="Selecteer ${p.name}">
        <div>
          <div class="prod__name">${p.name}</div>
          <div class="prod__why">${p.why || ""}</div>
          <div class="badges"><span class="badge">${p.tag || "Product"}</span></div>
        </div>
      </div>
      <input class="qty" type="number" min="1" max="99" value="${selected.get(p.id)?.qty || 1}" aria-label="Aantal">
    `;
    row.querySelector(".chk").addEventListener("change", (e)=> toggleProduct(p.id, e.target.checked));
    row.querySelector(".qty").addEventListener("change", (e)=> setQty(p.id, e.target.value));
    block3.appendChild(row);
  });

  split.appendChild(block2);
  split.appendChild(block3);
  contentEl.appendChild(split);

  renderCart();
  return; // <- belangrijk: voorkomt dat de oude layout eronder alsnog rendert
}

  function renderCart(){
    cartEl.innerHTML = "";

    const items = Array.from(selected.values());

    if(!items.length){
      cartEl.innerHTML = `<div class="muted">Nog geen producten gekozen.</div>`;
      return;
    }

    items.forEach(it=>{
      const row = document.createElement("div");
      row.className = "cartitem";
      row.innerHTML = `
        <div>
          <div class="cartitem__name">${it.name}</div>
          <div class="cartitem__meta">${it.tag || "Product"} • Aantal: ${it.qty}</div>
        </div>
        <div class="cartitem__right">
          <input class="qty" style="width:64px" type="number" min="1" max="99" value="${it.qty}" aria-label="Aantal ${it.name}">
          <button class="iconbtn" type="button" title="Verwijderen">×</button>
        </div>
      `;
      const qty = row.querySelector("input");
      const del = row.querySelector("button");
      qty.addEventListener("change", (e)=> setQty(it.id, e.target.value));
      del.addEventListener("click", ()=> { selected.delete(it.id); renderCart(); });
      cartEl.appendChild(row);
    });
  }

  function render(){
    const step = steps[stepIndex];
    kickerEl.textContent = `Stap ${stepIndex + 1} van ${steps.length}`;
    stepTitle.textContent = step.title;
    stepLead.textContent = step.lead || "";

    renderOptions(step);
    renderContent(step);

    backBtn.disabled = stepIndex === 0;

    // Next button logic
    if(step.id === "products"){
      nextBtn.textContent = "Naar afronden →";
      nextBtn.disabled = false;
    } else if(step.id === "done"){
      nextBtn.textContent = "Klaar";
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = "Volgende →";
      nextBtn.disabled = !isStepComplete(stepIndex);
    }

    renderProgress();
  }

  function next(){
    if(!isStepComplete(stepIndex)) return;
    if(stepIndex < steps.length - 1){
      stepIndex++;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back(){
    if(stepIndex > 0){
      stepIndex--;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function resetAll(){
    Object.keys(answers).forEach(k=>delete answers[k]);
    selected.clear();
    stepIndex = 0;
    render();
  }

  backBtn.addEventListener("click", back);
  nextBtn.addEventListener("click", next);
  resetBtn.addEventListener("click", resetAll);

  addAllBtn.addEventListener("click", async () => {
    const items = Array.from(selected.values());
    if(!items.length) return alert("Kies eerst producten.");
    try{
      await window.CartAPI.addAll(items);
      alert("Toegevoegd aan winkelwagen.");
    }catch(err){
      alert(String(err?.message || err));
    }
  });

  checkoutBtn.addEventListener("click", async () => {
    const items = Array.from(selected.values());
    if(!items.length) return alert("Kies eerst producten.");
    try{
      await window.CartAPI.addAll(items);
      window.CartAPI.goCheckout();
    }catch(err){
      alert(String(err?.message || err));
    }
  });

setTimeout(postHeight, 30);


  
  render();


function postHeight(){
  try{
    var h = document.documentElement.scrollHeight || document.body.scrollHeight || 900;
    window.parent && window.parent.postMessage(
      { type: "LOM_IFRAME_HEIGHT", height: h },
      "https://www.lakopmaat.nl"
    );
  }catch(e){}
}

// bij start + bij updates
setTimeout(postHeight, 50);
setTimeout(postHeight, 250);
window.addEventListener("resize", function(){ setTimeout(postHeight, 50); });




  
})();
