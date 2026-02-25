(function(){
  const SHOP_ORIGIN = "https://www.lakopmaat.nl";

  async function addAll(items){
    // Stuur naar de parent (lakopmaat.nl) om te voegen aan winkelwagen
    window.parent.postMessage(
      { type: "LOM_BULK_ADD", items: items.map(i => ({ id: i.ccvProductId, qty: i.qty || 1 })) },
      SHOP_ORIGIN
    );

    // wacht op response (ok/fail)
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Geen antwoord van winkelwagen script (timeout).")), 15000);

      function onMsg(e){
        if(e.origin !== SHOP_ORIGIN) return;
        if(!e.data || e.data.type !== "LOM_BULK_ADD_RESULT") return;
        window.removeEventListener("message", onMsg);
        clearTimeout(t);
        if(e.data.ok) resolve();
        else reject(new Error(e.data.error || "Toevoegen mislukt"));
      }
      window.addEventListener("message", onMsg);
    });
  }

  function goCheckout(){
    window.top.location.href = SHOP_ORIGIN + "/website/index.php?Show=WebShopBasket";
  }

  window.CartAPI = { addAll, goCheckout };
})();
