
// Cart adapter.
// 1) Plak hier straks jouw addViaXajax + openMiniCart functie(s) in.
// 2) Als die er is, gebruiken we die. Anders tonen we een duidelijke melding.

(function(){
  const SHOP_URL = "https://www.lakopmaat.nl"; // pas aan als je wil

  // Placeholder: je plakt jouw echte implementatie hieronder (of zet ze op window).
  // window.addViaXajax = async function(shopUrl, productId, qty){ ... }
  // window.openMiniCart = function(){ ... }

  async function addItem(productId, qty){
    if (typeof window.addViaXajax === "function") {
      await window.addViaXajax(SHOP_URL, productId, qty);
      return;
    }
    throw new Error("addViaXajax ontbreekt. Plak je CCV add-to-cart functie in public/cart.js.");
  }

  async function addAll(items){
    for (const it of items) {
      if(!it.ccvProductId) continue;
      await addItem(it.ccvProductId, it.qty || 1);
    }
    if (typeof window.openMiniCart === "function") window.openMiniCart();
  }

  function goCheckout(){
    // CCV basket pagina (meestal deze)
    window.top.location.href = `${SHOP_URL}/website/index.php?Show=WebShopBasket`;
  }

  window.CartAPI = { addAll, goCheckout };
})();
