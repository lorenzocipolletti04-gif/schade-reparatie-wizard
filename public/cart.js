(function(){
  const SHOP_ORIGIN = "https://www.lakopmaat.nl";

  async function addAll(items){
    // items: [{ ccvProductId, qty }]
    const payload = items
      .filter(i => i && i.ccvProductId)
      .map(i => ({ id: String(i.ccvProductId), qty: Math.max(1, parseInt(i.qty || 1, 10) || 1) }));

    if (!payload.length) throw new Error("Geen geldige producten (ccvProductId leeg).");

    // Stuur naar parent (lakopmaat.nl) om toe te voegen aan winkelwagen
    window.parent.postMessage(
      { type: "LOM_BULK_ADD", items: payload },
      SHOP_ORIGIN
    );

    // Wacht op resultaat
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Geen antwoord van winkelwagen script (timeout)."));
      }, 20000);

      function onMsg(e){
        if(e.origin !== SHOP_ORIGIN) return;
        const d = e.data || {};
        if(d.type !== "LOM_BULK_ADD_RESULT") return;
        cleanup();
        d.ok ? resolve() : reject(new Error(d.error || "Toevoegen mislukt"));
      }

      function cleanup(){
        clearTimeout(timeout);
        window.removeEventListener("message", onMsg);
      }

      window.addEventListener("message", onMsg);
    });
  }

  function goCheckout(){
    window.top.location.href = SHOP_ORIGIN + "/website/index.php?Show=WebShopBasket";
  }

  window.CartAPI = { addAll, goCheckout };
})();
