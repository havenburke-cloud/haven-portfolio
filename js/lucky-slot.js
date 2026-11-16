/* Lucky Tips nail slot machine (from lucky-tips-slot-machine.html). */
(() => {
  if (!document.getElementById("lucky-slot")) return;
  // ---- SETTINGS: edit these two lines ----
  const IMG_BASE = "images/lucky-slot/";                     // folder that holds /machine and /nails, ending in "/"
  const BOOK_URL = "";                                       // e.g. "https://YOUR-WEBSITE.com/book" (leave "" to hide the link)
  // ----------------------------------------

  const COLLECTIONS = {
    amalfi: { name: "Amalfi Picnic", blurb: "Stripes, gingham, olives, lemons and a lobster. 3D gel fruit." },
    beach:  { name: "Beach Club", blurb: "Pastel jelly with 3D hibiscus, starfish and grapefruit." },
    dots:   { name: "Millefiori", blurb: "Jelly French and glass-bead dot mosaics in every color." },
    aura:   { name: "Color Block", blurb: "Airbrushed aura gradients with bold outlined rims." },
    jewel:  { name: "Heirloom Jewels", blurb: "Rich solids, rim liners and gold-set jewel shields." },
    marble: { name: "Marble & Pearl", blurb: "Olive and toffee marble with pearls and gold frames." },
    jade:   { name: "Jade & Gold", blurb: "Jade kintsugi, gold caviar beads and soft nude splits." },
    goth:   { name: "Midnight Gothic", blurb: "Hand-painted storybook spooky on slate blue and black." },
    gold:   { name: "Gilded Mosaic", blurb: "Stained-glass panels, gold leaf, studs and bead chain." }
  };
  const NAMES = {
    amalfi: ["Olive Stripe","Spritz Gingham","Sardine Dot","3D Tomatoes","Ciao",
             "Ribbon Stripe","Lobster","Red Lip Napkin","Lemon Gingham","Bikini Stripe"],
    beach:  ["3D Hibiscus","Pink Bubble Flowers","Pool Heart","Hibiscus Print","Butterfly Jelly",
             "3D Starfish","Plumeria Shell","Pink Grapefruit","Bikini Plumeria","Pink Wave Jelly"],
    dots:   ["Cherry French Dots","Mint Millefiori","Citrus Millefiori","Blue French Dots","Sunset Millefiori",
             "Pastel French Dots","Olive Millefiori","Berry Millefiori","Coral French Dots"],
    aura:   ["Cherry Sky Rim","Black Split Grey","Rose Ombré","White Split Amber","Lime Aura",
             "Mint Black Rim","Lemon Split Pink","Blue Black Rim","Mint Garnet Rim","Cocoa Split Peach"],
    jewel:  ["Garnet Gold Rim","Black Split Mint","Rosewood Pink Rim","Emerald Shield","Peach Glow",
             "Caramel Black Rim","Jeweled Teal Bib","Sage Black Rim","Studded Pearl","Cocoa Gold Split"],
    marble: ["Olive Marble","Pearl Split Caramel","Olive Marble Mini","Pearl Cluster Rose","Toffee Marble",
             "Forest Rim Toffee","Rose Quartz Split","Topaz Jewel","Forest Rim Caramel","Nude Forest Split"],
    jade:   ["Jade Gold Rim","Gold Bar Split","Jade Kintsugi","Gold Frame Split","Gold Caviar Nude",
             "Espresso Rim","Coral Gold Split","Gold Bead Forest Rim","Gold Caviar Cinnamon","Garnet Split"],
    goth:   ["Smoke Roses","Skeleton Hand","Teardrop Eye","Web Filigree","Black Cat",
             "Moth Wings","Spider Web","Haunted House","Corpse Bride Script","Skull Swirl"],
    gold:   ["Mosaic Panel","Gold Ring Smoky","Copper Leaf","Teal Mosaic","Studded Smoky",
             "Bead Chain Smoky","Ochre Mosaic","Studded Garnet","Gold Leaf","Mini Mosaic"]
  };
  const NAILS = [];
  for (const key of Object.keys(COLLECTIONS)) {
    NAMES[key].forEach((n, i) => NAILS.push({ id: NAILS.length, coll: key, name: n, src: `${IMG_BASE}nails/${key}${String(i + 1).padStart(2, "0")}.webp` }));
  }
  // Warm up all 89 nail images once the page itself has finished loading.
  const preload = () => NAILS.forEach(n => { const im = new Image(); im.src = n.src; });
  if (document.readyState === "complete") setTimeout(preload, 400);
  else addEventListener("load", () => setTimeout(preload, 400));

  const root = document.getElementById("lucky-slot");
  const $ = id => document.getElementById(id);
  $("lts-base").src = `${IMG_BASE}machine/base.webp`;

  const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = () => Math.floor(Math.random() * NAILS.length);
  const machineEl = $("lts-machine"), reelsEl = $("lts-reels"), holdsEl = $("lts-holds");
  const spinBtn = $("lts-spin"), lever = $("lts-lever");
  let spinning = false, spinNo = 0;

  // exact curved outline of each drum face, and its position [left, width, top, height] in % of the machine image
  const DRUM_MASKS = [
    "data:image/png;base64,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",
    "data:image/png;base64,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",
    "data:image/png;base64,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",
    "data:image/png;base64,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",
    "data:image/png;base64,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"
  ];
  const DRUMS = [[7.129, 15.039, 17.705, 76.771], [24.414, 14.355, 17.705, 76.771], [41.699, 14.746, 17.847, 76.629],
                 [58.887, 14.453, 17.705, 76.771], [74.902, 15.430, 17.705, 76.771]];

  function setHeld(r, on) {
    r.held = on;
    r.hold.setAttribute("aria-pressed", on);
    r.hold.textContent = on ? "Held" : r.finger;
    r.el.classList.toggle("lts-held", on);
  }
  const reels = FINGERS.map((finger, i) => {
    const [left, width, top, height] = DRUMS[i];
    const el = document.createElement("div");
    el.className = "lts-reel";
    el.style.cssText = `left:${left}%;width:${width}%;top:${top}%;height:${height}%;-webkit-mask-image:url(${DRUM_MASKS[i]});mask-image:url(${DRUM_MASKS[i]})`;
    el.innerHTML = `<div class="lts-strip"></div>`;
    reelsEl.appendChild(el);
    const hold = document.createElement("button");
    hold.className = "lts-hold"; hold.type = "button";
    hold.style.cssText = `left:${left + width * 0.12}%;width:${width * 0.76}%`;
    hold.setAttribute("aria-pressed", "false");
    hold.setAttribute("aria-label", `Hold ${finger}`);
    hold.textContent = finger;
    holdsEl.appendChild(hold);
    const r = { finger, el, strip: el.querySelector(".lts-strip"), hold, held: false, vis: [rand(), rand(), rand(), rand(), rand()] };
    hold.addEventListener("click", () => { if (!spinning) setHeld(r, !r.held); });
    return r;
  });

  const cellH = () => reels[0].el.offsetHeight / 1.9;
  function sizeCells() { machineEl.style.setProperty("--cell", `${cellH()}px`); }
  const offsetFor = (r, idx) => r.el.offsetHeight / 2 - (idx + 0.5) * cellH();
  const cellHTML = id => `<div class="lts-cell"><img src="${NAILS[id].src}" alt="${NAILS[id].name}" draggable="false"></div>`;
  function renderStatic(r) {
    r.strip.innerHTML = r.vis.map(cellHTML).join("");
    r.strip.style.transform = `translateY(${offsetFor(r, 2)}px)`;
  }
  function relayout() { sizeCells(); if (!spinning) reels.forEach(renderStatic); }
  relayout();
  addEventListener("resize", relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(machineEl);

  function spinReel(r, i) {
    return new Promise(resolve => {
      if (r.held) return resolve();
      const finalVis = [rand(), rand(), rand(), rand(), rand()];
      const K = 16 + i * 5;
      const items = [...finalVis, ...Array.from({ length: K }, rand), ...r.vis];
      r.strip.innerHTML = items.map(cellHTML).join("");
      const from = offsetFor(r, 5 + K + 2), to = offsetFor(r, 2);
      const anim = r.strip.animate([
        { transform: `translateY(${from}px)`, filter: "blur(0px)" },
        { filter: "blur(1.6px)", offset: 0.15 },
        { filter: "blur(1.6px)", offset: 0.7 },
        { transform: `translateY(${to}px)`, filter: "blur(0px)" }
      ], { duration: reduceMotion ? 250 : 1500 + i * 380, easing: "cubic-bezier(.2,.7,.25,1.05)", fill: "forwards" });
      anim.onfinish = () => { r.vis = finalVis; renderStatic(r); anim.cancel(); resolve(); };
    });
  }

  async function spin() {
    if (spinning) return;
    if (reels.every(r => r.held)) { setVerdict("Every finger is held. Release one to spin.", ""); return; }
    spinning = true;
    spinBtn.disabled = true;
    reels.forEach(r => r.hold.disabled = true);
    root.classList.remove("lts-win");
    root.classList.add("lts-spinning");
    $("lts-count").textContent = `Spin ${++spinNo}`;
    lever.classList.add("lts-pulled");
    setTimeout(() => lever.classList.remove("lts-pulled"), 720);
    await Promise.all(reels.map(spinReel));
    root.classList.remove("lts-spinning");
    spinning = false;
    spinBtn.disabled = false;
    reels.forEach(r => r.hold.disabled = false);
    score();
  }

  function setVerdict(text, names) {
    $("lts-verdict").textContent = text;
    $("lts-names").textContent = names;
  }
  function score() {
    const set = reels.map(r => NAILS[r.vis[2]]);
    const counts = {};
    set.forEach(n => counts[n.coll] = (counts[n.coll] || 0) + 1);
    const [top, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const cname = COLLECTIONS[top].name;
    const ids = set.map(n => n.id);
    const dupe = ids.some((id, i) => ids.indexOf(id) !== i);
    let text;
    if (count === 5) text = `Jackpot. A full ${cname} set.`;
    else if (count === 4) text = `Four ${cname} nails. One spin from a full set.`;
    else if (count === 3) text = `Three ${cname} on the line.`;
    else if (dupe) text = "A matching pair. Mix-and-match set.";
    else text = "A true mix-and-match set.";
    root.classList.toggle("lts-win", count >= 4);
    setVerdict(text, set.map((n, i) => `${FINGERS[i]}: ${n.name}`).join(" · "));
    if (BOOK_URL) {
      const book = $("lts-book");
      const note = set.map((n, i) => `${FINGERS[i]}: ${n.name}`).join(", ");
      book.href = BOOK_URL + (BOOK_URL.includes("?") ? "&" : "?") + "set=" + encodeURIComponent(note);
      book.hidden = false;
    }
  }

  spinBtn.addEventListener("click", spin);
  lever.addEventListener("click", spin);
  score();

  // Lets the intro start a spin automatically (see initIntro in main.js).
  window.luckySlot = { spin, isSpinning: () => spinning };
})();
