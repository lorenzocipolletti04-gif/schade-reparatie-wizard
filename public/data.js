
// 1) Product catalog (vul later jouw CCV product IDs in)
window.PRODUCTS = {
  ontvetter: { id:"ontvetter", name:"Siliconenverwijderaar / Ontvetter", why:"Voor een schone, hechtende ondergrond.", ccvProductId:"", defaultQty:1, tag:"Voorbereiding" },
  schuur_p400: { id:"schuur_p400", name:"Schuurpapier P400", why:"Voor opschuren van bestaande lak / primer.", ccvProductId:"", defaultQty:2, tag:"Schuren" },
  schuur_p800: { id:"schuur_p800", name:"Schuurpapier P800", why:"Voor finish schuren vóór kleur/blanke lak.", ccvProductId:"", defaultQty:2, tag:"Schuren" },
  plamuur: { id:"plamuur", name:"Plamuur (polyester)", why:"Voor deukjes / diepe schade vullen.", ccvProductId:"", defaultQty:1, tag:"Vullen" },
  primer_universeel: { id:"primer_universeel", name:"Primer (universeel)", why:"Basislaag voor hechting & bescherming.", ccvProductId:"", defaultQty:1, tag:"Primer" },
  primer_kunststof: { id:"primer_kunststof", name:"Kunststof primer", why:"Voor optimale hechting op kunststof.", ccvProductId:"", defaultQty:1, tag:"Primer" },
  kleur_spuitbus: { id:"kleur_spuitbus", name:"Spuitbus autolak op kleurcode", why:"De kleurlaag passend bij jouw auto.", ccvProductId:"", defaultQty:1, tag:"Kleur" },
  blanke_lak_2k: { id:"blanke_lak_2k", name:"2K Blanke lak (hoogglans)", why:"Bescherming + diepe glans + benzinebestendig.", ccvProductId:"", defaultQty:1, tag:"Aflak" },
  poets: { id:"poets", name:"Polijstmiddel (finish)", why:"Voor een mooie overgang en glans.", ccvProductId:"", defaultQty:1, tag:"Afwerking" },
};

window.STEPS = [
  {
    id:"damage",
    title:"Wat voor schade heb je?",
    lead:"Kies wat het meest lijkt op jouw situatie.",
    options:[
      { value:"kras", title:"Kras / schaafplek", sub:"Op lak, eventueel tot primer/blank metaal." },
      { value:"steenslag", title:"Steenslag", sub:"Kleine plekjes, vaak op motorkap/bumpers." },
      { value:"roest", title:"Roestplek(ken)", sub:"Bruin/oranje plekken of bobbels in de lak." },
      { value:"deuk", title:"Deuk / putje", sub:"Lak mogelijk beschadigd, vaak plamuur nodig." },
    ],
  },
  {
    id:"substrate",
    title:"Wat is de ondergrond waar je op uitkomt?",
    lead:"Dit bepaalt vooral welke primer je nodig hebt.",
    options:[
      { value:"bestaande_lak", title:"Bestaande lak (geschuurd)", sub:"Je schuurt mat en bouwt opnieuw op." },
      { value:"blank_metaal", title:"Blank metaal", sub:"Staal/verzinkt/alu, kaal geschuurd." },
      { value:"kunststof", title:"Kunststof (bumper)", sub:"Plastic delen zoals bumpers/spoilers." },
      { value:"plamuur", title:"Plamuur / filler", sub:"Je hebt gevuld of gaat vullen." },
    ],
  },
  {
    id:"size",
    title:"Hoe groot is de schade?",
    lead:"Grootte helpt met aantallen en aanpak.",
    options:[
      { value:"klein", title:"Klein", sub:"Tot ~5 cm (spotrepair)" },
      { value:"middel", title:"Middel", sub:"5–25 cm (deel paneel)" },
      { value:"groot", title:"Groot", sub:">25 cm / hele bumper/paneel" },
    ],
  },
  {
    id:"finish",
    title:"Hoe wil je afwerken?",
    lead:"Kies wat je uiteindelijk wilt spuiten/afmaken.",
    options:[
      { value:"kleur_plus_2k", title:"Kleur + 2K blanke lak", sub:"Beste glans & bescherming." },
      { value:"kleur_only", title:"Alleen kleur (zonder blanke lak)", sub:"Kan bij uni kleuren, minder bescherming." },
      { value:"bijtippen", title:"Bijtippen", sub:"Klein plekje, minder spuitwerk." },
    ],
  },
  {
    id:"products",
    title:"Kies je producten en volg de stappen",
    lead:"Vink aan wat je nodig hebt. Wij zetten dit straks in je winkelwagen.",
    options:[], // geen keuze hier
  },
  {
    id:"done",
    title:"Klaar om af te rekenen",
    lead:"Voeg alles toe aan je winkelwagen en rond je bestelling af.",
    options:[],
  }
];

// 2) Simple rule engine: welke producten per stap/keuze
window.getPlan = function getPlan(answers){
  const prods = window.PRODUCTS;

  // basis altijd
  const needed = new Map();
  function add(p, qty){
    if(!p) return;
    const cur = needed.get(p.id);
    needed.set(p.id, { ...p, qty: (cur?.qty || 0) + (qty || p.defaultQty || 1) });
  }

  add(prods.ontvetter, 1);

  // schuren varianten
  add(prods.schuur_p400, answers.size === "groot" ? 4 : 2);
  add(prods.schuur_p800, answers.size === "groot" ? 4 : 2);

  // primer keuze
  if(answers.substrate === "kunststof") add(prods.primer_kunststof, 1);
  else add(prods.primer_universeel, 1);

  // schade-specifiek
  if(answers.damage === "deuk") add(prods.plamuur, 1);
  if(answers.damage === "roest") {
    // later: roestomvormer / epoxy etc.
    // (voeg je producten toe wanneer je ze hebt)
  }

  // afwerking
  if(answers.finish === "kleur_plus_2k") add(prods.blanke_lak_2k, 1);
  if(answers.finish === "kleur_plus_2k" || answers.finish === "kleur_only") add(prods.kleur_spuitbus, answers.size === "groot" ? 2 : 1);
  if(answers.finish === "bijtippen") add(prods.poets, 1);

  // stappen tekst
  const stepsText = [
    { title:"1) Reinigen & ontvetten", text:"Was het oppervlak, droog goed en ontvet met siliconenverwijderaar. Raak daarna niet meer met je vingers aan." },
    { title:"2) Schuren", text:"Schuur de omgeving ruim mat. Werk van grof naar fijn (bijv. P400 → P800) voor een strakke overgang." },
    { title:"3) Primer", text:"Breng 1–3 dunne lagen primer aan. Laat drogen en schuur licht na (P800) indien nodig." },
    { title:"4) Kleurlaag", text:"Spuit meerdere dunne lagen. Houd beweging constant en werk in overlappende banen." },
    { title:"5) Blanke lak (indien gekozen)", text:"2K blanke lak in 1–2 lagen. Laat goed uitharden voor polijsten/gebruik." },
    { title:"6) Afwerking", text:"Na uitharding kun je polijsten voor extra glans en een mooiere overgang." }
  ];

  return {
    needed: Array.from(needed.values()),
    stepsText,
    badges: [
      answers.damage ? `Schade: ${answers.damage}` : null,
      answers.substrate ? `Ondergrond: ${answers.substrate}` : null,
      answers.size ? `Grootte: ${answers.size}` : null,
      answers.finish ? `Afwerking: ${answers.finish}` : null,
    ].filter(Boolean)
  };
};
