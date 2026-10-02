/* ==========================================================================
   Titan Reliquary · Wing II · THE VAULT
   - window.TitanVaultWing.render(ctx)  : builds the vault wing into #vault-body
   - window.TitanVaultWing.playDoor()   : cinematic strongroom door (once per session)
   - window.TitanVaultWing.replayDoor() : replay on demand (also ?vaultdoor=1)
   Pure vanilla, no network, no libraries. Door = canvas-2D painted steel on
   CSS 3D layers (thickness, parallax, hinge swing) + light, rays and dust.
   ========================================================================== */
(function () {
  "use strict";

  var DOOR_KEY = "tr_vault_door_v1";
  var ctxRef = null; // last render context { vault, open(scan), active }

  /* ---------------- formatting ---------------- */
  function isNum(n) { return n != null && n !== "" && !Number.isNaN(Number(n)); }
  var NFC = {};
  function fmtN(v, min, max) { // shared Intl.NumberFormat (toLocaleString(locale, options) builds a new one per call)
    var k = min + "," + max;
    return (NFC[k] || (NFC[k] = new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max }))).format(v);
  }
  function money(n, dec) {
    if (!isNum(n)) return "—";
    var d = dec == null ? 2 : dec;
    var s = fmtN(Math.abs(Number(n)), d, d);
    return (Number(n) < 0 ? "−$" : "$") + s;
  }
  function moneyBig(n) {
    // "$4,572" + small ".09"
    if (!isNum(n)) return "—";
    var s = money(n);
    var i = s.lastIndexOf(".");
    return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<span class="vx-cents">' + esc(s.slice(i)) + "</span>";
  }
  function oz(n, d) {
    if (!isNum(n)) return "—";
    return fmtN(Number(n), d == null ? 2 : d, d == null ? 4 : d) + " oz";
  }
  function pct(n, d) {
    if (!isNum(n)) return "—";
    return Number(n).toFixed(d == null ? 1 : d) + "%";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function signed(n, fmt) {
    if (!isNum(n)) return "—";
    var v = Number(n);
    return (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));
  }

  /* ---------------- data model (read-only, from window.vault) ---------------- */
  function model(v) {
    var metals = v.metals || {};
    var prec = v.precious || {};
    var board = v.board || {};
    var spot = metals.spot || {};
    var prior = metals.prior_spot || {};
    var spotAg = Number(spot.ag_usd_oz ?? prec.spot_ag ?? board.spot_ag);
    var spotAu = Number(spot.au_usd_oz ?? prec.spot_au ?? board.spot_au);
    var agOz = Number((metals.oz || {}).ag ?? (prec.combined_silver || {}).oz ?? (board.silver || {}).oz);
    var auOz = Number((metals.oz || {}).au ?? (prec.combined_gold || {}).oz ?? (board.gold || {}).oz);
    // Use the ledger's own melt figures when published (they are what the Hall shows); else fine weight x spot.
    var meltAg = isNum((metals.melt || {}).ag_usd) ? Number(metals.melt.ag_usd) : agOz * spotAg;
    var meltAu = isNum((metals.melt || {}).au_usd) ? Number(metals.melt.au_usd) : auOz * spotAu;
    var m = {
      spotAg: spotAg, spotAu: spotAu, agOz: agOz, auOz: auOz,
      priorAg: isNum(prior.ag_usd_oz) ? Number(prior.ag_usd_oz) : null,
      priorAu: isNum(prior.au_usd_oz) ? Number(prior.au_usd_oz) : null,
      meltAg: meltAg, meltAu: meltAu, melt: meltAg + meltAu,
      ratio: spotAg ? spotAu / spotAg : null,
      asOf: metals.as_of_local || metals.as_of || v.generated_at_pt || "",
      source: metals.source || "",
      grand: Number(board.grand),
      ledger: v.ledger_version || board.ledger_version || "",
      policy: v.policy || metals.policy || "",
    };
    // value composition (ledger board)
    var cats = [
      ["bullion", "Bullion (silver & gold)"],
      ["albums", "Coin albums"],
      ["flips", "Coins in flips"],
      ["housing", "Housing & tools"],
      ["sets", "Mint & proof sets"],
      ["stamps", "Stamps"],
    ];
    m.comp = cats.map(function (c) {
      var b = board[c[0]] || {};
      return { key: c[0], label: c[1], usd: Number(b.usd) };
    }).filter(function (c) { return isNum(c.usd) && c.usd > 0; }).sort(function (a, b) { return b.usd - a.usd; });
    // where the silver / gold physically sits
    var inv = metals.inventory || {};
    var lots = v.bullion || [];
    function lotLabel(key) {
      var scan = (String(key).match(/^[A-Z]\d{3}/) || [])[0];
      var lot = scan && lots.find(function (x) { return x.scan === scan; });
      return lot ? (lot.label || lot.denom || scan) : null;
    }
    var agNames = {
      ase_albums: "American Silver Eagles in albums",
      bullion: "Bullion stack (B-lots)",
      s001_proof: "2021-S silver proof set",
      junk_flips: "Silver coins in flips",
    };
    m.agWhere = Object.keys(inv.ag || {}).map(function (k) {
      var e = inv.ag[k] || {};
      var n = e.pieces ? Object.keys(e.pieces).length : null;
      return { key: k, label: agNames[k] || lotLabel(k) || k.replace(/_/g, " "), oz: Number(e.oz), note: e.note || "", pieces: n };
    }).filter(function (x) { return isNum(x.oz) && x.oz > 0; }).sort(function (a, b) { return b.oz - a.oz; });
    m.auWhere = Object.keys(inv.au || {}).map(function (k) {
      var e = inv.au[k] || {};
      var scan = (String(k).match(/^[A-Z]\d{3}/) || [])[0] || "";
      return { key: k, scan: scan, label: lotLabel(k) || k.replace(/_/g, " "), oz: Number(e.oz) };
    }).filter(function (x) { return isNum(x.oz) && x.oz > 0; }).sort(function (a, b) { return b.oz - a.oz; });
    return m;
  }

  /** Fine weight of a lot, read from its own record (asw_oz, else "ASW/AGW n oz" or "n oz" in metal/label). */
  function lotWeight(item) {
    if (isNum(item.asw_oz)) return { oz: Number(item.asw_oz), from: "record" };
    var srcs = [item.metal || "", item.label || "", item.denom || ""];
    for (var i = 0; i < srcs.length; i++) {
      var s = srcs[i];
      var m = s.match(/\b(?:ASW|AGW)\s*~?\s*(\d+(?:\.\d+)?)\s*oz/i);
      if (m) return { oz: Number(m[1]), from: "record" };
    }
    // a single-piece lot described as "1 oz" / "1/10 oz"
    var qty = Number(item.qty_n || 1);
    for (var j = 0; j < srcs.length; j++) {
      var f = srcs[j].match(/\b(\d+)\s*\/\s*(\d+)\s*oz\b/i);
      if (f) return { oz: qty * Number(f[1]) / Number(f[2]), from: "description" };
      var w = srcs[j].match(/\b(\d+(?:\.\d+)?)\s*(?:troy\s*)?oz\b/i);
      if (w) return { oz: qty * Number(w[1]), from: "description" };
    }
    return null;
  }
  function lotMetal(item) {
    var s = (item.metal || "") + " " + (item.cat || "") + " " + (item.label || "");
    if (item.is_gold || /\bAu\b|gold/i.test(s)) return "au";
    if (item.is_silver || /\bAg\b|silver/i.test(s)) return "ag";
    return "";
  }
  function lotShape(item, kind) {
    var cat = String(item.cat || "").toLowerCase();
    var label = String(item.label || "").toLowerCase();
    if (kind === "set") return "set";
    if (kind === "stamp") return "stamp";
    if (kind === "housing") return /tool|scale/.test(cat + label) ? "tool" : (/chest/.test(label) && /wood/.test(label + (item.metal || "")) ? "chest" : "safe");
    var metal = lotMetal(item);
    if (/bar|assay/.test(cat + " " + label)) return metal === "au" ? "goldbar" : "bar";
    if (metal === "au") return "goldcoin";
    if (Number(item.qty_n) > 1) return "stack";
    if (/round/.test(cat)) return "round";
    return "coin";
  }

  /* ---------------- render ---------------- */
  function render(ctx) {
    ctxRef = ctx;
    var v = ctx.vault || window.vault || {};
    var body = document.getElementById("vault-body");
    if (!body) return;
    var m = model(v);

    body.innerHTML =
      '<div class="vx" id="vx-root">' +
      heroHtml(m) +
      whereHtml(m) +
      compHtml(m) +
      lotsHtml(v, m) +
      flipsHtml(v, m) +
      whatIfHtml(m) +
      '<p class="vx-foot">Spot recorded ' + esc(m.asOf) +
      (m.source ? " (" + esc(m.source) + ")" : "") + ". Melt = fine weight × recorded spot. Estimates are the ledger’s.</p>" +
      "</div>";

    wire(body, v, m);

    if (ctx.active) {
      var played = doorPlayed();
      if (!played || forceDoor()) {
        var forced = forceDoor();
        forceDoorUsed = true;
        playDoor({ force: forced });
      }
    }
  }

  function trend(now, before, fmt) {
    if (!isNum(before) || !isNum(now) || !before) return '<span class="vx-chg flat">no prior fix recorded</span>';
    var d = now - before;
    var p = d / before * 100;
    var cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
    var arrow = d > 0 ? "▲" : d < 0 ? "▼" : "■";
    return '<span class="vx-chg ' + cls + '"><span aria-hidden="true">' + arrow + "</span> " +
      signed(d, fmt) + " (" + signed(p, function (x) { return x.toFixed(2) + "%"; }) + ")" +
      '<span class="vx-chg-note"> vs previous fix</span></span>';
  }

  function heroHtml(m) {
    var share = m.grand ? m.melt / m.grand * 100 : null;
    return '<section class="vx-sec vx-hero" style="--i:0" aria-labelledby="vx-hero-h">' +
      '<div class="vx-hero-main">' +
        '<div class="vx-eyebrow">Physical metal · at recorded spot</div>' +
        '<h3 id="vx-hero-h" class="vx-hero-num">' + moneyBig(m.melt) + "</h3>" +
        '<p class="vx-hero-formula">' +
          '<span><b>' + esc(oz(m.agOz, 2)) + "</b> silver × " + esc(money(m.spotAg)) + " = " + esc(money(m.meltAg)) + "</span>" +
          '<span><b>' + esc(oz(m.auOz, 4)) + "</b> gold × " + esc(money(m.spotAu)) + " = " + esc(money(m.meltAu)) + "</span>" +
        "</p>" +
        '<div class="vx-hero-meta">' +
          (m.grand ? '<div class="vx-kv"><span class="k">Whole collection (ledger estimate)</span><span class="v">' + esc(money(m.grand)) + "</span></div>" : "") +
          (share != null ? '<div class="vx-kv"><span class="k">Metal content share</span><span class="v">' + esc(pct(share, 0)) + "</span></div>" : "") +
          (m.policy ? '<div class="vx-kv vx-policy"><span class="k">Policy</span><span class="v">' + esc(m.policy) + "</span></div>" : "") +
        "</div>" +
      "</div>" +
      '<div class="vx-spots">' +
        spotCard("ag", "Silver", "Ag", m.spotAg, m.priorAg, m.agOz, m.meltAg, 2) +
        spotCard("au", "Gold", "Au", m.spotAu, m.priorAu, m.auOz, m.meltAu, 4) +
        '<div class="vx-ratio"><span class="k">Gold / silver ratio</span><span class="v">' + (m.ratio ? esc(m.ratio.toFixed(1)) + " : 1" : "—") + "</span></div>" +
        '<div class="vx-asof"><span class="vx-dot" aria-hidden="true"></span>Spot recorded ' + esc(m.asOf) + (m.source ? " · " + esc(m.source) : "") + "</div>" +
      "</div>" +
      "</section>";
  }
  function spotCard(cls, name, sym, spot, prior, held, melt, d) {
    return '<div class="vx-spot ' + cls + '">' +
      '<div class="vx-spot-head"><span class="vx-sym ' + cls + '" aria-hidden="true">' + sym + "</span><span class=\"vx-spot-name\">" + name + " <small>per troy oz</small></span></div>" +
      '<div class="vx-spot-price">' + esc(money(spot)) + "</div>" +
      trend(spot, prior, function (x) { return money(x); }) +
      '<div class="vx-spot-held"><span>Held <b>' + esc(oz(held, d)) + "</b></span><span>Melt <b>" + esc(money(melt)) + "</b></span></div>" +
      "</div>";
  }

  function whereHtml(m) {
    if (!m.agWhere.length && !m.auWhere.length) return "";
    var agTot = m.agWhere.reduce(function (s, x) { return s + x.oz; }, 0);
    var shades = ["s1", "s2", "s3", "s4", "s5", "s6"];
    var bar = m.agWhere.map(function (x, i) {
      var w = agTot ? x.oz / agTot * 100 : 0;
      return '<span class="vx-seg ' + shades[i % shades.length] + '" style="flex-grow:' + x.oz.toFixed(4) + ";min-width:" + (w < 2 ? "6px" : "0") + '" title="' + esc(x.label + ": " + oz(x.oz)) + '"></span>';
    }).join("");
    var rows = m.agWhere.map(function (x, i) {
      return '<li><span class="vx-sw ' + shades[i % shades.length] + '" aria-hidden="true"></span>' +
        '<span class="vx-where-l">' + esc(x.label) + (x.pieces ? ' <small>(' + x.pieces + " coins)</small>" : "") + "</span>" +
        '<span class="vx-where-oz">' + esc(oz(x.oz)) + "</span>" +
        '<span class="vx-where-p">' + esc(pct(agTot ? x.oz / agTot * 100 : 0)) + "</span>" +
        '<span class="vx-where-m">' + esc(money(x.oz * m.spotAg)) + "</span></li>";
    }).join("");
    var auTot = m.auWhere.reduce(function (s, x) { return s + x.oz; }, 0);
    var auRows = m.auWhere.map(function (x) {
      return '<li><span class="vx-sw au" aria-hidden="true"></span>' +
        '<span class="vx-where-l">' + esc(x.label) + (x.scan ? " <small>" + esc(x.scan) + "</small>" : "") + "</span>" +
        '<span class="vx-where-oz">' + esc(oz(x.oz, 4)) + "</span>" +
        '<span class="vx-where-p">' + esc(pct(auTot ? x.oz / auTot * 100 : 0)) + "</span>" +
        '<span class="vx-where-m">' + esc(money(x.oz * m.spotAu)) + "</span></li>";
    }).join("");
    return '<section class="vx-sec vx-where" style="--i:1" aria-labelledby="vx-where-h">' +
      '<header class="vx-head"><h3 id="vx-where-h">Where the metal sits</h3><p>Every troy ounce, by where it is kept</p></header>' +
      '<div class="vx-where-grid">' +
        '<div class="vx-where-col">' +
          '<div class="vx-where-title"><span class="vx-sym ag" aria-hidden="true">Ag</span> Silver <b>' + esc(oz(agTot, 2)) + "</b></div>" +
          '<div class="vx-bar" role="img" aria-label="Silver by location">' + bar + "</div>" +
          '<ul class="vx-where-list">' + rows + "</ul>" +
        "</div>" +
        (auRows ? '<div class="vx-where-col">' +
          '<div class="vx-where-title"><span class="vx-sym au" aria-hidden="true">Au</span> Gold <b>' + esc(oz(auTot, 4)) + "</b></div>" +
          '<div class="vx-bar" role="img" aria-label="Gold by lot">' + m.auWhere.map(function (x, i) {
            return '<span class="vx-seg au' + (i % 2 ? " alt" : "") + '" style="flex-grow:' + x.oz.toFixed(4) + '"></span>';
          }).join("") + "</div>" +
          '<ul class="vx-where-list">' + auRows + "</ul>" +
        "</div>" : "") +
      "</div></section>";
  }

  function compHtml(m) {
    if (!m.comp.length) return "";
    var max = m.comp[0].usd;
    var sum = m.comp.reduce(function (s, c) { return s + c.usd; }, 0);
    var rows = m.comp.map(function (c) {
      return '<li class="vx-comp-row"><span class="vx-comp-l">' + esc(c.label) + "</span>" +
        '<span class="vx-comp-track"><span class="vx-comp-fill' + (c.key === "bullion" ? " hi" : "") + '" style="width:' + (c.usd / max * 100).toFixed(1) + '%"></span></span>' +
        '<span class="vx-comp-v">' + esc(money(c.usd)) + "</span>" +
        '<span class="vx-comp-p">' + esc(pct(c.usd / sum * 100)) + "</span></li>";
    }).join("");
    return '<section class="vx-sec vx-comp" style="--i:2" aria-labelledby="vx-comp-h">' +
      '<header class="vx-head"><h3 id="vx-comp-h">What the collection is worth</h3><p>Ledger estimates by category' +
      (m.grand ? " · total <b>" + esc(money(m.grand)) + "</b>" : "") + "</p></header>" +
      '<ul class="vx-comp-list">' + rows + "</ul></section>";
  }

  function lotsHtml(v, m) {
    var groups = [
      { key: "au", title: "Gold", items: [] },
      { key: "ag", title: "Silver bullion", items: [] },
      { key: "set", title: "Mint & proof sets", items: [] },
      { key: "housing", title: "Housing & tools", items: [] },
      { key: "stamp", title: "Stamps", items: [] },
    ];
    var byKey = {};
    groups.forEach(function (g) { byKey[g.key] = g; });
    (v.bullion || []).forEach(function (x) { (lotMetal(x) === "au" ? byKey.au : byKey.ag).items.push({ item: x, kind: "bullion" }); });
    (v.sets || []).forEach(function (x) { byKey.set.items.push({ item: x, kind: "set" }); });
    (v.housing || []).forEach(function (x) { byKey.housing.items.push({ item: x, kind: "housing" }); });
    (v.stamps || []).forEach(function (x) { byKey.stamp.items.push({ item: x, kind: "stamp" }); });
    var used = groups.filter(function (g) { return g.items.length; });
    var total = used.reduce(function (s, g) { return s + g.items.length; }, 0);
    var chips = '<button type="button" class="vx-chip on" data-filter="all" aria-pressed="true">All <span>' + total + "</span></button>" +
      used.map(function (g) {
        return '<button type="button" class="vx-chip" data-filter="' + g.key + '" aria-pressed="false">' + esc(g.title) + " <span>" + g.items.length + "</span></button>";
      }).join("");
    var html = used.map(function (g) {
      return '<div class="vx-group" data-group="' + g.key + '"><h4 class="vx-group-h">' + esc(g.title) + " <span>" + g.items.length + "</span></h4>" +
        '<div class="vx-lots">' + g.items.map(function (e) { return lotCard(e.item, e.kind, m); }).join("") + "</div></div>";
    }).join("");
    return '<section class="vx-sec vx-inv" style="--i:3" aria-labelledby="vx-inv-h">' +
      '<header class="vx-head"><h3 id="vx-inv-h">The reserve shelves</h3><p>Bullion, sets, housing and stamps · tap any lot for its dossier</p></header>' +
      '<div class="vx-chips" role="toolbar" aria-label="Filter lots">' + chips + "</div>" + html + "</section>";
  }

  function lotCard(item, kind, m) {
    var metal = kind === "bullion" ? lotMetal(item) : "";
    var w = kind === "bullion" ? lotWeight(item) : null;
    var spot = metal === "au" ? m.spotAu : metal === "ag" ? m.spotAg : null;
    var meltNow = w && spot ? w.oz * spot : null;
    var shape = lotShape(item, kind);
    var qty = Number(item.qty_n || 1);
    var meta = [item.country, item.year && item.year !== "ND" ? item.year : "", qty > 1 ? "×" + qty : ""].filter(Boolean).join(" · ");
    var title = String(item.label || item.denom || item.scan).replace(/\s*·\s*[A-Z]\d{3}$/, "");
    var stats = "";
    if (kind === "bullion") {
      stats += stat(metal === "au" ? "Gold" : "Silver", w ? oz(w.oz, w.oz < 1 ? 4 : 2) : "—");
      stats += meltNow != null ? stat("Melt at spot", money(meltNow)) : stat("Melt (ledger)", money(item.melt));
    } else if (isNum(item.melt)) {
      stats += stat("Melt (ledger)", money(item.melt));
    }
    stats += stat("Estimate", money(item.est), "est");
    var stackN = Math.max(2, Math.min(qty, 7));
    return '<button type="button" class="vx-lot" data-scan="' + esc(item.scan) + '" aria-label="' + esc(title + ", " + item.scan + ". Open dossier") + '">' +
      '<span class="vx-lot-stage" aria-hidden="true"><span class="vx-obj ' + shape + (metal ? " m-" + metal : "") + '" style="--n:' + stackN + '">' +
        (shape === "stack" ? new Array(stackN + 1).join("<i></i>") : "<i></i>") + "</span></span>" +
      '<span class="vx-lot-top"><span class="vx-lot-id">' + esc(item.scan) + "</span>" +
        (metal ? '<span class="vx-purity ' + metal + '">' + (metal === "au" ? "Au" : "Ag") + "</span>" : "") + "</span>" +
      '<span class="vx-lot-title">' + esc(title) + "</span>" +
      (meta ? '<span class="vx-lot-meta">' + esc(meta) + "</span>" : "") +
      '<span class="vx-lot-stats">' + stats + "</span>" +
      "</button>";
  }
  function stat(k, v, cls) {
    return '<span class="vx-stat' + (cls ? " " + cls : "") + '"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + "</span></span>";
  }

  function flipsHtml(v, m) {
    var rows = (v.flips || []).filter(function (f) { return f.is_silver && isNum(f.asw_oz); });
    if (!rows.length) return "";
    var tot = rows.reduce(function (s, f) { return s + Number(f.asw_oz); }, 0);
    var max = rows.reduce(function (s, f) { return Math.max(s, Number(f.asw_oz)); }, 0);
    var body = rows.map(function (f) {
      var melt = Number(f.asw_oz) * m.spotAg;
      return '<tr data-scan="' + esc(f.scan) + '" tabindex="0" data-k-coin="' + esc(f.label || f.denom) + '" data-k-year="' + esc(parseInt(f.year, 10) || 0) + '" data-k-asw="' + Number(f.asw_oz) + '" data-k-melt="' + melt + '" data-k-est="' + (Number(f.est) || 0) + '">' +
        '<td class="c-coin"><span class="vx-coin-name">' + esc(f.country || "") + " · " + esc(f.denom || f.label || "") + '</span><span class="vx-coin-ser">' + esc(f.ser || f.scan) + "</span></td>" +
        '<td class="c-year" data-l="Year">' + esc(f.year || "—") + "</td>" +
        '<td class="c-asw num" data-l="Silver"><span class="vx-asw"><span class="vx-asw-t"><span style="width:' + (max ? Number(f.asw_oz) / max * 100 : 0).toFixed(1) + '%"></span></span>' + esc(oz(f.asw_oz, 4)) + "</span></td>" +
        '<td class="c-melt num" data-l="Melt">' + esc(money(melt)) + "</td>" +
        '<td class="c-est num" data-l="Estimate">' + esc(money(f.est)) + "</td></tr>";
    }).join("");
    function th(k, label, cls, sort) {
      return '<th scope="col" class="' + (cls || "") + '"' + (sort ? ' aria-sort="' + sort + '"' : "") + '><button type="button" data-sort="' + k + '">' + label + '<span class="vx-sort" aria-hidden="true"></span></button></th>';
    }
    return '<section class="vx-sec vx-flips" style="--i:4" aria-labelledby="vx-flips-h">' +
      '<header class="vx-head"><h3 id="vx-flips-h">Silver hiding in the flips</h3><p>' + rows.length + " coins · " + esc(oz(tot, 4)) + " fine silver · melt " + esc(money(tot * m.spotAg)) + "</p></header>" +
      '<div class="vx-table-wrap"><table class="vx-table" id="vx-flip-table"><thead><tr>' +
      th("coin", "Coin", "c-coin") + th("year", "Year", "c-year") + th("asw", "Silver", "c-asw num", "descending") + th("melt", "Melt", "c-melt num") + th("est", "Estimate", "c-est num") +
      "</tr></thead><tbody>" + body + "</tbody></table></div></section>";
  }

  function whatIfHtml(m) {
    if (!isNum(m.spotAg) || !isNum(m.spotAu)) return "";
    var agMax = Math.max(150, Math.ceil(m.spotAg * 2 / 10) * 10);
    var auMax = Math.max(8000, Math.ceil(m.spotAu * 2 / 100) * 100);
    return '<section class="vx-sec vx-whatif" style="--i:5" aria-labelledby="vx-wi-h">' +
      '<header class="vx-head"><h3 id="vx-wi-h">If the price moves</h3><p>Slide the prices to see what the metal would be worth. Policy stays <b>' + esc(m.policy || "HOLD") + "</b>; this is only arithmetic.</p></header>" +
      '<div class="vx-wi-grid">' +
        '<div class="vx-wi-controls">' +
          slider("vx-wi-ag", "Silver price per oz", 10, agMax, 0.01, m.spotAg, money(m.spotAg)) +
          slider("vx-wi-au", "Gold price per oz", 1000, auMax, 0.1, m.spotAu, money(m.spotAu)) +
          slider("vx-wi-bid", "Dealer pays (% of melt) · your assumption", 70, 100, 1, 90, "90%") +
          '<button type="button" class="vx-btn" id="vx-wi-reset">Reset to recorded spot</button>' +
        "</div>" +
        '<div class="vx-wi-out" aria-live="off">' +
          '<div class="vx-wi-card main"><span class="k">Metal would be worth</span><output class="v" id="vx-wi-melt">' + esc(money(m.melt)) + '</output><span class="d" id="vx-wi-delta">same as today</span></div>' +
          '<div class="vx-wi-card"><span class="k">A dealer might pay</span><output class="v" id="vx-wi-dealer">' + esc(money(m.melt * 0.9)) + "</output></div>" +
          '<div class="vx-wi-split"><span id="vx-wi-agv">Silver ' + esc(money(m.meltAg)) + '</span><span id="vx-wi-auv">Gold ' + esc(money(m.meltAu)) + "</span></div>" +
        "</div>" +
      "</div></section>";
  }
  function slider(id, label, min, max, step, val, shown) {
    return '<div class="vx-slider"><label for="' + id + '"><span>' + esc(label) + '</span><output id="' + id + '-o" for="' + id + '">' + esc(shown) + "</output></label>" +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" aria-valuetext="' + esc(shown) + '" /></div>';
  }

  /* ---------------- behaviour ---------------- */
  function wire(body, v, m) {
    var open = function (scan) {
      if (!scan) return;
      if (ctxRef && typeof ctxRef.open === "function") ctxRef.open(scan);
    };
    body.querySelectorAll(".vx-lot[data-scan]").forEach(function (b) {
      b.addEventListener("click", function () { open(b.dataset.scan); });
    });
    body.querySelectorAll("#vx-flip-table tbody tr[data-scan]").forEach(function (tr) {
      tr.addEventListener("click", function () { open(tr.dataset.scan); });
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(tr.dataset.scan); } });
    });

    // filter chips
    var chips = body.querySelectorAll(".vx-chip");
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.dataset.filter;
        chips.forEach(function (x) { var on = x === c; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
        body.querySelectorAll(".vx-group").forEach(function (g) { g.hidden = !(f === "all" || g.dataset.group === f); });
      });
    });

    // sortable flips table
    var table = body.querySelector("#vx-flip-table");
    if (table) {
      var state = { k: "asw", dir: -1 };
      var sortRows = function () {
        var tb = table.tBodies[0];
        var rows = Array.prototype.slice.call(tb.rows);
        rows.sort(function (a, b) {
          var x = a.getAttribute("data-k-" + state.k), y = b.getAttribute("data-k-" + state.k);
          var nx = Number(x), ny = Number(y);
          var r = (state.k === "coin") ? String(x).localeCompare(String(y)) : (nx - ny);
          return r * state.dir;
        });
        rows.forEach(function (r) { tb.appendChild(r); });
        table.querySelectorAll("th").forEach(function (th) {
          var b = th.querySelector("button");
          if (b && b.dataset.sort === state.k) th.setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending");
          else th.removeAttribute("aria-sort");
        });
      };
      table.querySelectorAll("th button[data-sort]").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.dataset.sort;
          if (state.k === k) state.dir = -state.dir;
          else { state.k = k; state.dir = (k === "coin") ? 1 : -1; }
          sortRows();
        });
      });
    }

    // what-if
    var ag = body.querySelector("#vx-wi-ag"), au = body.querySelector("#vx-wi-au"), bid = body.querySelector("#vx-wi-bid");
    if (ag && au && bid) {
      var $o = function (id) { return body.querySelector("#" + id); };
      var recalc = function () {
        var a = Number(ag.value), g = Number(au.value), p = Number(bid.value) / 100;
        // the sliders snap to a step; treat a value at the recorded spot as exactly the recorded spot
        if (Math.abs(a - m.spotAg) < 0.006) a = m.spotAg;
        if (Math.abs(g - m.spotAu) < 0.06) g = m.spotAu;
        var agv = a === m.spotAg ? m.meltAg : m.agOz * a, auv = g === m.spotAu ? m.meltAu : m.auOz * g, tot = agv + auv;
        var d = tot - m.melt;
        $o("vx-wi-ag-o").textContent = money(a);
        $o("vx-wi-au-o").textContent = money(g, 0);
        $o("vx-wi-bid-o").textContent = Math.round(p * 100) + "%";
        ag.setAttribute("aria-valuetext", money(a) + " per ounce"); au.setAttribute("aria-valuetext", money(g, 0) + " per ounce"); bid.setAttribute("aria-valuetext", Math.round(p * 100) + " percent of melt");
        $o("vx-wi-melt").textContent = money(tot);
        $o("vx-wi-dealer").textContent = money(tot * p);
        $o("vx-wi-agv").textContent = "Silver " + money(agv);
        $o("vx-wi-auv").textContent = "Gold " + money(auv);
        var dl = $o("vx-wi-delta");
        if (Math.abs(d) < 0.005) { dl.textContent = "same as today"; dl.className = "d"; }
        else { dl.textContent = "if prices moved: " + signed(d, money) + " (" + signed(d / m.melt * 100, function (x) { return x.toFixed(1) + "%"; }) + ") vs today's melt"; dl.className = "d " + (d > 0 ? "up" : "down"); }
        [ag, au, bid].forEach(function (el) {
          var f = (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)) * 100;
          el.style.setProperty("--fill", f.toFixed(2) + "%");
        });
      };
      [ag, au, bid].forEach(function (el) { el.addEventListener("input", recalc); });
      var reset = body.querySelector("#vx-wi-reset");
      if (reset) reset.addEventListener("click", function () { ag.value = m.spotAg; au.value = m.spotAu; bid.value = 90; recalc(); });
      recalc();
    }

    // subtle pointer tilt on lot cards (desktop only)
    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reducedMotion()) {
      body.querySelectorAll(".vx-lot").forEach(function (card) {
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty("--rx", (-ny * 5).toFixed(2) + "deg");
          card.style.setProperty("--ry", (nx * 7).toFixed(2) + "deg");
          card.style.setProperty("--mx", ((nx + 0.5) * 100).toFixed(1) + "%");
          card.style.setProperty("--my", ((ny + 0.5) * 100).toFixed(1) + "%");
        });
        card.addEventListener("pointerleave", function () {
          card.style.removeProperty("--rx"); card.style.removeProperty("--ry");
        });
      });
    }
  }

  /* ======================================================================
     THE DOOR
     ====================================================================== */
  var forceDoorUsed = false;
  function forceDoor() { return /[?&]vaultdoor=1\b/.test(location.search) && !forceDoorUsed; }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  var memPlayed = false;
  function doorPlayed() {
    if (memPlayed) return true;
    try { return !!sessionStorage.getItem(DOOR_KEY); } catch (e) { return false; }
  }
  function markPlayed() {
    memPlayed = true;
    try { sessionStorage.setItem(DOOR_KEY, "1"); } catch (e) { /* private mode */ }
  }

  // easing
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
  function inOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function inOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function inCubic(x) { return x * x * x; }
  function inQuad(x) { return x * x; }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function outQuart(x) { return 1 - Math.pow(1 - x, 4); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // timeline (ms)
  var T = {
    capIn: [120, 700], capOut: [1750, 2250],
    dial: [260, 1000],
    wheel: [880, 1720],
    bolts: [1300, 1950], clunk: 1960,
    pop: [1980, 2160],
    swing: [2120, 3300],
    push: [2780, 3700],
    bloom: [3300, 3700],
    fade: [3620, 4000],
    end: 4000,
  };

  var door = null; // active door instance

  function playDoor(opts) {
    opts = opts || {};
    if (door) return;
    markPlayed();
    if (reducedMotion() && !opts.force) return;
    // Phones: the 4 s strongroom door paints ~8 large canvases and 3D layers (~0.5 s blocked on a mid phone);
    // skip it unless asked for (?vaultdoor=1 or the replay button still force it).
    if (!opts.force && window.matchMedia && window.matchMedia("(max-width: 700px), (hover: none) and (pointer: coarse)").matches) return;
    if (document.documentElement.classList.contains("ts-on")) return; // splash is showing
    try { door = buildDoor(); } catch (e) { door = null; return; }
    door.start();
  }

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function parseColor(str) {
    var c = document.createElement("canvas").getContext("2d");
    c.fillStyle = "#c8a94a";
    try { c.fillStyle = str; } catch (e) { /* keep */ }
    var s = c.fillStyle; // "#rrggbb" or "rgba(...)"
    if (s[0] === "#") return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    var m = s.match(/[\d.]+/g) || [200, 169, 74];
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  function mix(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function mkCanvas(w, h, dpr) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    c.style.width = w + "px";
    c.style.height = h + "px";
    var g = c.getContext("2d");
    g.scale(dpr, dpr);
    return { el: c, g: g };
  }

  // seeded random so the door looks the same every time
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* --- painters --- */
  function bevelRing(g, r0, r1, raised, a) {
    var grd = g.createLinearGradient(-r1, -r1, r1, r1);
    var hi = "rgba(255,255,255," + (0.55 * a) + ")", lo = "rgba(0,0,0," + (0.6 * a) + ")";
    grd.addColorStop(0, raised ? hi : lo);
    grd.addColorStop(0.5, "rgba(128,128,128,0)");
    grd.addColorStop(1, raised ? lo : hi);
    g.beginPath(); g.arc(0, 0, r1, 0, Math.PI * 2); g.arc(0, 0, r0, 0, Math.PI * 2, true);
    g.fillStyle = grd; g.fill();
  }
  function groove(g, r, w) {
    g.lineWidth = w;
    g.strokeStyle = "rgba(0,0,0,0.55)"; g.beginPath(); g.arc(-0.5, -0.5, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.arc(0.6, 0.6, r, 0, Math.PI * 2); g.stroke();
  }
  function brushed(g, R, rand, base) {
    // base steel with directional light from top-left
    var grd = g.createLinearGradient(-R, -R, R, R);
    grd.addColorStop(0, base[0]); grd.addColorStop(0.5, base[1]); grd.addColorStop(1, base[2]);
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    // circular brushing
    for (var r = 1; r < R; r += 0.7) {
      var a = 0.012 + rand() * 0.05;
      g.strokeStyle = rand() < 0.5 ? "rgba(255,255,255," + a + ")" : "rgba(0,0,0," + (a * 1.2) + ")";
      g.lineWidth = 0.35 + rand() * 0.6;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    }
    // anisotropic sheen (the "bow tie" of lathe-turned metal)
    if (g.createConicGradient) {
      var cg = g.createConicGradient(-Math.PI / 4, 0, 0);
      var W = "rgba(255,255,255,";
      cg.addColorStop(0, W + "0.30)"); cg.addColorStop(0.07, W + "0.04)"); cg.addColorStop(0.2, W + "0)");
      cg.addColorStop(0.43, W + "0.06)"); cg.addColorStop(0.5, W + "0.22)"); cg.addColorStop(0.57, W + "0.05)");
      cg.addColorStop(0.8, W + "0)"); cg.addColorStop(0.93, W + "0.04)"); cg.addColorStop(1, W + "0.30)");
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
      var cd = g.createConicGradient(Math.PI / 4, 0, 0);
      var B = "rgba(0,0,0,";
      cd.addColorStop(0, B + "0.28)"); cd.addColorStop(0.1, B + "0)"); cd.addColorStop(0.4, B + "0)"); cd.addColorStop(0.5, B + "0.22)");
      cd.addColorStop(0.6, B + "0)"); cd.addColorStop(0.9, B + "0)"); cd.addColorStop(1, B + "0.28)");
      g.fillStyle = cd; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    }
  }
  function boltHead(g, x, y, r) {
    g.save();
    g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = r * 0.9; g.shadowOffsetX = r * 0.25; g.shadowOffsetY = r * 0.35;
    var grd = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    grd.addColorStop(0, "#f4f6f8"); grd.addColorStop(0.35, "#aab1b9"); grd.addColorStop(0.8, "#4d535b"); grd.addColorStop(1, "#2a2e33");
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.restore();
    // hex socket
    g.save(); g.translate(x, y); g.rotate(0.3);
    g.fillStyle = "rgba(10,12,14,0.75)"; g.beginPath();
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; g[i ? "lineTo" : "moveTo"](Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38); }
    g.closePath(); g.fill(); g.restore();
  }
  function arcText(g, text, r, size, startAngle, gold) {
    g.save();
    g.font = "600 " + size + "px Fraunces, Georgia, 'Times New Roman', serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    var chars = text.split("");
    var widths = chars.map(function (c) { return g.measureText(c).width + size * 0.28; });
    var total = widths.reduce(function (s, w) { return s + w; }, 0);
    var ang = startAngle - total / r / 2;
    for (var i = 0; i < chars.length; i++) {
      var a = ang + widths[i] / 2 / r;
      g.save(); g.rotate(a + Math.PI / 2); g.translate(0, -r);
      g.fillStyle = "rgba(0,0,0,0.75)"; g.fillText(chars[i], -0.7, -0.7); // engraved shadow
      g.fillStyle = "rgba(255,255,255,0.18)"; g.fillText(chars[i], 0.8, 0.8);
      var gg = g.createLinearGradient(0, -size / 2, 0, size / 2);
      gg.addColorStop(0, gold[0]); gg.addColorStop(0.5, gold[1]); gg.addColorStop(1, gold[2]);
      g.fillStyle = gg; g.fillText(chars[i], 0, 0);
      g.restore();
      ang += widths[i] / r;
    }
    g.restore();
  }

  function paintFace(g, R) {
    var rand = rng(7);
    g.save(); g.translate(R, R);
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.clip();
    brushed(g, R, rand, ["#b3b9bf", "#6f757c", "#30343a"]);
    // raised outer lip + chamfer
    bevelRing(g, R * 0.95, R, true, 1);
    groove(g, R * 0.948, 1.4);
    // bolt-head circle
    groove(g, R * 0.83, 1.2);
    var n = R > 170 ? 24 : 18;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + Math.PI / n;
      boltHead(g, Math.cos(a) * R * 0.89, Math.sin(a) * R * 0.89, R * 0.026 + 0.6);
    }
    // recessed field
    bevelRing(g, R * 0.78, R * 0.815, false, 0.9);
    var vig = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 0.78);
    vig.addColorStop(0, "rgba(255,255,255,0.04)"); vig.addColorStop(1, "rgba(0,0,0,0.18)");
    g.fillStyle = vig; g.beginPath(); g.arc(0, 0, R * 0.78, 0, Math.PI * 2); g.fill();
    // engraved legend with gold inlay
    var gold = ["#fff0c2", "#d4af5a", "#8a6a24"];
    if (R > 120) {
      arcText(g, "TITAN  RELIQUARY", R * 0.69, Math.max(9, R * 0.066), -Math.PI / 2, gold);
      arcText(g, "·  STRONGROOM  ·  WING  II  ·", R * 0.69, Math.max(8, R * 0.05), Math.PI / 2, gold);
    }
    // chronometer ticks
    groove(g, R * 0.6, 1);
    g.save();
    for (var k = 0; k < 120; k++) {
      var aa = k / 120 * Math.PI * 2;
      var long = k % 10 === 0;
      g.strokeStyle = long ? "rgba(230,200,130,0.85)" : "rgba(0,0,0,0.45)";
      g.lineWidth = long ? 1.6 : 0.8;
      g.beginPath();
      g.moveTo(Math.cos(aa) * R * 0.605, Math.sin(aa) * R * 0.605);
      g.lineTo(Math.cos(aa) * R * (long ? 0.645 : 0.625), Math.sin(aa) * R * (long ? 0.645 : 0.625));
      g.stroke();
    }
    g.restore();
    // brass mount plate for the wheel
    var br = R * 0.21;
    g.save();
    g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = R * 0.04; g.shadowOffsetX = R * 0.01; g.shadowOffsetY = R * 0.018;
    var bg = g.createLinearGradient(-br, -br, br, br);
    bg.addColorStop(0, "#f7e4a6"); bg.addColorStop(0.45, "#b8903e"); bg.addColorStop(1, "#5c4414");
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, br, 0, Math.PI * 2); g.fill();
    g.restore();
    bevelRing(g, br * 0.86, br, true, 0.9);
    // shading: overall top-left key light / bottom-right falloff
    var sh = g.createRadialGradient(-R * 0.45, -R * 0.5, R * 0.1, 0, 0, R * 1.15);
    sh.addColorStop(0, "rgba(255,255,255,0.10)"); sh.addColorStop(0.55, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.32)");
    g.fillStyle = sh; g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    // crisp outer edge
    g.save(); g.translate(R, R);
    g.strokeStyle = "rgba(0,0,0,0.7)"; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R - 0.75, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  function paintWheel(g, W, shadowOnly) {
    g.save(); g.translate(W, W);
    var spokes = 5;
    function shape(fillSpoke, fillKnob) {
      for (var i = 0; i < spokes; i++) {
        g.save(); g.rotate(i / spokes * Math.PI * 2 - Math.PI / 2);
        var r0 = W * 0.18, r1 = W * 0.8, w0 = W * 0.075, w1 = W * 0.045;
        g.beginPath();
        g.moveTo(r0, -w0); g.lineTo(r1, -w1); g.lineTo(r1, w1); g.lineTo(r0, w0); g.closePath();
        fillSpoke(); g.fill();
        g.beginPath(); g.arc(W * 0.84, 0, W * 0.115, 0, Math.PI * 2);
        fillKnob(); g.fill();
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, W * 0.3, 0, Math.PI * 2); fillKnob(true); g.fill();
    }
    if (shadowOnly) {
      // soft shadow baked with the offset-shadow trick (no ctx.filter needed)
      g.translate(-W * 4, 0);
      g.shadowColor = "rgba(0,0,0,0.62)"; g.shadowBlur = Math.max(4, W * 0.07); g.shadowOffsetX = W * 4;
      shape(function () { g.fillStyle = "rgba(0,0,0,0.55)"; }, function () { g.fillStyle = "rgba(0,0,0,0.55)"; });
      g.restore();
      return;
    }
    shape(function () {
      var gr = g.createLinearGradient(0, -W * 0.08, 0, W * 0.08);
      gr.addColorStop(0, "#2d3137"); gr.addColorStop(0.3, "#eef1f4"); gr.addColorStop(0.55, "#9aa1a9"); gr.addColorStop(1, "#23272c");
      g.fillStyle = gr;
    }, function (hub) {
      var r = hub ? W * 0.3 : W * 0.115;
      var cx = hub ? 0 : W * 0.84;
      var gr = g.createRadialGradient(cx - r * 0.35, -r * 0.4, r * 0.05, cx, 0, r);
      if (hub) { gr.addColorStop(0, "#fff4cf"); gr.addColorStop(0.4, "#c9a14c"); gr.addColorStop(1, "#4d3910"); }
      else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.3, "#c3c9cf"); gr.addColorStop(0.75, "#50565e"); gr.addColorStop(1, "#1f2226"); }
      g.fillStyle = gr;
    });
    // knurling on knobs
    for (var i = 0; i < spokes; i++) {
      g.save(); g.rotate(i / spokes * Math.PI * 2 - Math.PI / 2);
      g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.6;
      for (var k = -3; k <= 3; k++) {
        g.beginPath(); g.moveTo(W * 0.84 + k * W * 0.026, -W * 0.1); g.lineTo(W * 0.84 + k * W * 0.026, W * 0.1); g.stroke();
      }
      g.restore();
    }
    // hub collar
    g.strokeStyle = "rgba(60,40,8,0.8)"; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, W * 0.3, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,240,200,0.5)"; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, W * 0.27, 0, Math.PI * 2); g.stroke();
    // index mark for the dial
    g.fillStyle = "#fff3cf"; g.beginPath();
    g.moveTo(0, -W * 0.215); g.lineTo(-W * 0.03, -W * 0.27); g.lineTo(W * 0.03, -W * 0.27); g.closePath(); g.fill();
    g.restore();
  }

  function paintDial(g, D) {
    g.save(); g.translate(D, D);
    var gr = g.createRadialGradient(-D * 0.3, -D * 0.35, D * 0.05, 0, 0, D);
    gr.addColorStop(0, "#3a3c42"); gr.addColorStop(0.6, "#121317"); gr.addColorStop(1, "#050506");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, D, 0, Math.PI * 2); g.fill();
    for (var k = 0; k < 100; k++) {
      var a = k / 100 * Math.PI * 2 - Math.PI / 2;
      var big = k % 10 === 0, mid = k % 5 === 0;
      g.strokeStyle = big ? "#f3dc9a" : "rgba(230,205,140,0.6)";
      g.lineWidth = big ? 1.4 : 0.7;
      var r1 = D * 0.93, r0 = D * (big ? 0.72 : mid ? 0.8 : 0.85);
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
    if (D > 26) {
      g.fillStyle = "#f3dc9a"; g.font = "600 " + Math.round(D * 0.2) + "px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (var n = 0; n < 10; n++) {
        var an = n / 10 * Math.PI * 2 - Math.PI / 2;
        g.fillText(String(n * 10), Math.cos(an) * D * 0.55, Math.sin(an) * D * 0.55);
      }
    }
    var cap = g.createRadialGradient(-D * 0.08, -D * 0.1, 0, 0, 0, D * 0.25);
    cap.addColorStop(0, "#fff4cf"); cap.addColorStop(0.5, "#c9a14c"); cap.addColorStop(1, "#4d3910");
    g.fillStyle = cap; g.beginPath(); g.arc(0, 0, D * 0.22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, D * 0.99, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  function paintFrame(g, R, Rh, S) {
    // S = half-size of the canvas; outer ring radius Ro
    var Ro = R * 1.42;
    var rand = rng(21);
    g.save(); g.translate(S, S);
    // soft contact shadow of the ring on the wall
    g.save();
    g.shadowColor = "rgba(0,0,0,0.85)"; g.shadowBlur = R * 0.18; g.shadowOffsetY = R * 0.05;
    g.fillStyle = "#2a2d31"; g.beginPath(); g.arc(0, 0, Ro, 0, Math.PI * 2); g.arc(0, 0, Rh, 0, Math.PI * 2, true); g.fill();
    g.restore();
    // ring metal
    g.save();
    g.beginPath(); g.arc(0, 0, Ro, 0, Math.PI * 2); g.arc(0, 0, Rh, 0, Math.PI * 2, true); g.clip("evenodd");
    brushed(g, Ro, rand, ["#8e949a", "#4f545a", "#202327"]);
    // recessed bolt channel
    var ch = R * 1.1;
    var cg = g.createRadialGradient(0, 0, Rh, 0, 0, ch);
    cg.addColorStop(0, "rgba(0,0,0,0.9)"); cg.addColorStop(0.55, "rgba(14,15,18,0.78)"); cg.addColorStop(1, "rgba(40,43,48,0.45)");
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, ch, 0, Math.PI * 2); g.arc(0, 0, Rh, 0, Math.PI * 2, true); g.fill("evenodd");
    bevelRing(g, ch, ch + R * 0.03, false, 1);
    bevelRing(g, Ro - R * 0.05, Ro, true, 1);
    groove(g, R * 1.2, 1.2);
    // brass inlay ring
    var bi = g.createLinearGradient(-R, -R * 1.3, R, R * 1.3);
    bi.addColorStop(0, "#fbe7a8"); bi.addColorStop(0.5, "#b88d36"); bi.addColorStop(1, "#5e4412");
    g.strokeStyle = bi; g.lineWidth = Math.max(1.5, R * 0.012);
    g.beginPath(); g.arc(0, 0, R * 1.265, 0, Math.PI * 2); g.stroke();
    groove(g, R * 1.3, 1);
    // rivets
    var n = R > 170 ? 36 : 28;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      boltHead(g, Math.cos(a) * R * 1.36, Math.sin(a) * R * 1.36, R * 0.02 + 0.5);
    }
    g.restore();
    // hinge barrels (left)
    [-0.52, 0.52].forEach(function (yy) {
      var hw = R * 0.16, hh = R * 0.34, x = -R * 1.2, y = yy * R - hh / 2;
      g.save();
      g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowBlur = R * 0.06; g.shadowOffsetX = R * 0.02; g.shadowOffsetY = R * 0.03;
      var hg = g.createLinearGradient(x - hw / 2, 0, x + hw / 2, 0);
      hg.addColorStop(0, "#1f2226"); hg.addColorStop(0.3, "#d9dde1"); hg.addColorStop(0.55, "#7c838b"); hg.addColorStop(1, "#1a1c20");
      g.fillStyle = hg;
      g.beginPath();
      if (g.roundRect) g.roundRect(x - hw / 2, y, hw, hh, hw * 0.3); else g.rect(x - hw / 2, y, hw, hh);
      g.fill();
      g.restore();
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(x - hw / 2, y + hh * 0.48, hw, 1.5);
    });
    g.restore();
  }

  function paintTunnel(g, Rh, tint) {
    var warm = tint;
    var light = mix(warm, [255, 255, 255], 0.55);
    g.save(); g.translate(Rh, Rh);
    g.fillStyle = "#050506"; g.fillRect(-Rh, -Rh, Rh * 2, Rh * 2);
    // 1. the jamb: a thick steel collar receding to the inner opening
    var ri = Rh * 0.7;
    var col = g.createRadialGradient(0, Rh * 0.04, ri, 0, 0, Rh);
    col.addColorStop(0, rgba(mix(warm, [120, 124, 130], 0.55), 1));
    col.addColorStop(0.35, "rgb(58,61,66)");
    col.addColorStop(1, "rgb(10,11,12)");
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, Rh, 0, Math.PI * 2); g.fill();
    for (var k = 1; k <= 4; k++) { // machined rings in the collar
      var rr = ri + (Rh - ri) * (k / 5);
      g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 1.2;
      g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = rgba(light, 0.10 + 0.05 * (5 - k)); g.lineWidth = 0.8;
      g.beginPath(); g.arc(0, 0.8, rr, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
    // 2. the room beyond, seen through the inner opening
    g.save();
    g.beginPath(); g.arc(0, 0, ri, 0, Math.PI * 2); g.clip();
    var horizon = ri * 0.2;
    var wall = g.createRadialGradient(0, -ri * 0.1, 0, 0, -ri * 0.1, ri * 1.1);
    wall.addColorStop(0, "rgb(255,251,238)"); wall.addColorStop(0.28, rgba(light, 1)); wall.addColorStop(0.7, rgba(warm, 1)); wall.addColorStop(1, rgba(mix(warm, [30, 24, 14], 0.6), 1));
    g.fillStyle = wall; g.fillRect(-ri, -ri, ri * 2, ri * 2);
    // floor (polished, reflects the light)
    var fl = g.createLinearGradient(0, horizon, 0, ri);
    fl.addColorStop(0, rgba(light, 1)); fl.addColorStop(0.35, rgba(mix(warm, [60, 50, 30], 0.45), 1)); fl.addColorStop(1, "rgb(24,20,14)");
    g.fillStyle = fl; g.fillRect(-ri, horizon, ri * 2, ri);
    // side shelving, silhouetted, with glints of metal
    [-1, 1].forEach(function (side) {
      var x0 = side * ri * 0.5, w = ri * 0.5;
      var sx = side < 0 ? x0 - w : x0;
      var sg = g.createLinearGradient(sx, 0, sx + w, 0);
      var dark = "rgba(28,24,18,0.92)", mid = "rgba(70,60,40,0.75)";
      sg.addColorStop(0, side < 0 ? dark : mid); sg.addColorStop(1, side < 0 ? mid : dark);
      g.fillStyle = sg; g.fillRect(sx, -ri * 0.55, w, ri * 0.55 + horizon);
      for (var sh = 0; sh < 4; sh++) {
        var yy = -ri * 0.45 + sh * ri * 0.17;
        g.fillStyle = "rgba(10,9,7,0.9)"; g.fillRect(sx, yy, w, 2);
        for (var bx = 0; bx < 4; bx++) {
          var gx = sx + w * (0.12 + bx * 0.21);
          var isGold = (sh + bx + (side > 0 ? 1 : 0)) % 5 === 0;
          g.fillStyle = isGold ? "rgba(236,190,90,0.85)" : "rgba(210,216,222,0.7)";
          g.fillRect(gx, yy - ri * 0.035, w * 0.14, ri * 0.035);
          g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(gx, yy - ri * 0.035, w * 0.14, 0.8);
        }
      }
    });
    // centre plinth with a backlit pyramid of ingots
    var bw = ri * 0.17, bh = ri * 0.06, baseY = horizon + ri * 0.12;
    g.fillStyle = "rgba(20,17,12,0.95)";
    g.fillRect(-bw * 2.4, baseY, bw * 4.8, ri * 0.09);
    g.fillStyle = rgba(light, 0.9); g.fillRect(-bw * 2.4, baseY, bw * 4.8, 1.2);
    var rows = [[-1.5, -0.5, 0.5, 1.5], [-1, 0, 1], [-0.5, 0.5], [0]];
    rows.forEach(function (row, rix) {
      row.forEach(function (cx, ci) {
        var x = cx * bw * 1.05, y = baseY - rix * bh * 1.02;
        var goldBar = (rix === 3) || (rix === 1 && ci === 1);
        g.beginPath();
        g.moveTo(x - bw / 2, y); g.lineTo(x + bw / 2, y); g.lineTo(x + bw / 2 - bw * 0.13, y - bh); g.lineTo(x - bw / 2 + bw * 0.13, y - bh); g.closePath();
        var fg = g.createLinearGradient(0, y - bh, 0, y);
        if (goldBar) { fg.addColorStop(0, "#f7d88a"); fg.addColorStop(1, "#6e4c12"); }
        else { fg.addColorStop(0, "#c9ced4"); fg.addColorStop(1, "#3a3e44"); }
        g.fillStyle = fg; g.fill();
        g.strokeStyle = goldBar ? "rgba(255,236,170,0.95)" : "rgba(255,255,255,0.9)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x - bw / 2 + bw * 0.13, y - bh + 0.5); g.lineTo(x + bw / 2 - bw * 0.13, y - bh + 0.5); g.stroke();
      });
    });
    // reflection of the stack on the floor
    var rf = g.createLinearGradient(0, baseY + ri * 0.09, 0, baseY + ri * 0.3);
    rf.addColorStop(0, rgba(light, 0.35)); rf.addColorStop(1, rgba(light, 0));
    g.fillStyle = rf; g.fillRect(-bw * 2.4, baseY + ri * 0.09, bw * 4.8, ri * 0.22);
    g.restore();
    // inner lip highlight + mouth shadow
    g.strokeStyle = rgba(light, 0.7); g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, ri, 0, Math.PI * 2); g.stroke();
    var lip = g.createRadialGradient(0, 0, Rh * 0.88, 0, 0, Rh);
    lip.addColorStop(0, "rgba(0,0,0,0)"); lip.addColorStop(1, "rgba(0,0,0,0.85)");
    g.fillStyle = lip; g.beginPath(); g.arc(0, 0, Rh, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function paintRays(g, S, tint) {
    var rand = rng(99);
    g.save(); g.translate(S, S);
    g.globalCompositeOperation = "lighter";
    var n = 26;
    for (var i = 0; i < n; i++) {
      var a = rand() * Math.PI * 2;
      var len = S * (0.55 + rand() * 0.45);
      var w = 0.025 + rand() * 0.07;
      var alpha = 0.05 + rand() * 0.11;
      for (var layer = 0; layer < 3; layer++) {
        var ww = w * (1 + layer * 0.9), aa = alpha / (1 + layer * 1.4);
        var grd = g.createRadialGradient(0, 0, 0, 0, 0, len);
        grd.addColorStop(0, rgba(mix(tint, [255, 255, 255], 0.5), aa));
        grd.addColorStop(0.35, rgba(tint, aa * 0.6));
        grd.addColorStop(1, rgba(tint, 0));
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(0, 0);
        g.arc(0, 0, len, a - ww / 2, a + ww / 2);
        g.closePath(); g.fill();
      }
    }
    // fade the hub and the tips (baked, so no CSS mask is needed)
    g.globalCompositeOperation = "destination-in";
    var mk = g.createRadialGradient(0, 0, 0, 0, 0, S);
    mk.addColorStop(0, "rgba(0,0,0,0)"); mk.addColorStop(0.12, "rgba(0,0,0,1)"); mk.addColorStop(0.45, "rgba(0,0,0,0.9)"); mk.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = mk; g.fillRect(-S, -S, S * 2, S * 2);
    g.restore();
  }

  function buildDoor() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var phone = Math.min(vw, vh) < 560;
    var D = Math.round(Math.min(vw * (phone ? 0.66 : 0.5), vh * 0.5, 470));
    var R = D / 2;
    var Rh = R * 1.012;
    var dpr = Math.min(window.devicePixelRatio || 1, phone ? 2 : 2);
    var T3 = Math.round(R * 0.3); // door thickness
    var tint = mix(parseColor(cssVar("--gold", "#c8a94a")), [255, 246, 226], 0.45);
    var bgCol = cssVar("--bg", "#060605");

    var root = document.createElement("div");
    root.className = "vd-root";
    root.setAttribute("role", "presentation");
    root.style.setProperty("--vd-R", R + "px");
    root.style.setProperty("--vd-tint", rgba(tint, 1));
    root.style.setProperty("--vd-tint-a", rgba(tint, 0.35));
    root.style.setProperty("--vd-bg", bgCol);

    var S = Math.round(R * 1.6); // frame canvas half-size
    root.innerHTML =
      '<div class="vd-wall" aria-hidden="true"></div>' +
      '<div class="vd-cam" aria-hidden="true">' +
        '<div class="vd-opening"><div class="vd-core"></div></div>' +
        '<div class="vd-frame"></div>' +
        '<div class="vd-spill"></div>' +
        '<div class="vd-persp"><div class="vd-door"></div></div>' +
        '<div class="vd-seam"></div>' +
      "</div>" +
      '<div class="vd-beam" aria-hidden="true"><div class="vd-rays"></div></div>' +
      '<canvas class="vd-dust" aria-hidden="true"></canvas>' +
      '<div class="vd-bloom" aria-hidden="true"></div>' +
      '<div class="vd-caption" aria-hidden="true"><span class="vd-eyebrow">Wing II</span><span class="vd-title">The Vault</span></div>' +
      '<button type="button" class="vd-skip">Skip <span aria-hidden="true">›</span></button>';

    var cam = root.querySelector(".vd-cam");
    var opening = root.querySelector(".vd-opening");
    var core = root.querySelector(".vd-core");
    var frameBox = root.querySelector(".vd-frame");
    var doorEl = root.querySelector(".vd-door");
    var seam = root.querySelector(".vd-seam");
    var spill = root.querySelector(".vd-spill");
    var beam = root.querySelector(".vd-beam");
    var rays = root.querySelector(".vd-rays");
    var dust = root.querySelector(".vd-dust");
    var bloom = root.querySelector(".vd-bloom");
    var caption = root.querySelector(".vd-caption");
    var skipBtn = root.querySelector(".vd-skip");

    // tunnel
    var tun = mkCanvas(Rh * 2, Rh * 2, Math.min(dpr, 1.5));
    paintTunnel(tun.g, Rh, tint);
    tun.el.className = "vd-tunnel";
    opening.insertBefore(tun.el, core);

    // frame
    var fr = mkCanvas(S * 2, S * 2, dpr);
    paintFrame(fr.g, R, Rh, S);
    frameBox.appendChild(fr.el);

    // door: thickness layers, bolts, face, spindle, wheel, dial
    var layers = phone ? 18 : 28;
    var edgeHtml = "";
    for (var i = layers; i >= 1; i--) {
      var z = -(i / layers) * T3;
      var shade = 0.35 + 0.5 * (1 - i / layers);
      var lA = Math.round(62 + shade * 70), lB = Math.round(lA * 0.45);
      edgeHtml += '<div class="vd-edge' + (i === layers ? " back" : "") + '" style="transform:translateZ(' + z.toFixed(1) + "px);background:linear-gradient(180deg, rgb(" + (lA + 40) + "," + (lA + 44) + "," + (lA + 48) + "), rgb(" + lA + "," + (lA + 3) + "," + (lA + 7) + ") 45%, rgb(" + lB + "," + (lB + 2) + "," + (lB + 5) + '))"></div>';
    }
    var nb = 12, boltLen = R * 0.22, boltW = R * 0.085;
    var boltHtml = "";
    for (var b = 0; b < nb; b++) {
      var ang = b / nb * 360;
      boltHtml += '<div class="vd-bolt" data-a="' + ang + '" style="width:' + boltLen.toFixed(1) + "px;height:" + boltW.toFixed(1) + "px;margin:" + (-boltW / 2).toFixed(1) + 'px 0 0 0"></div>';
    }
    var spindleHtml = "";
    var wheelZ = Math.round(R * 0.2);
    for (var s = 1; s <= 5; s++) spindleHtml += '<div class="vd-spindle" style="transform:translateZ(' + (s / 6 * wheelZ).toFixed(1) + 'px)"></div>';
    doorEl.innerHTML = edgeHtml + '<div class="vd-bolts">' + boltHtml + "</div>" + spindleHtml;
    var face = mkCanvas(D, D, dpr);
    paintFace(face.g, R);
    face.el.className = "vd-face";
    doorEl.appendChild(face.el);
    var W = R * 0.62;
    var wsh = mkCanvas(W * 2, W * 2, 1);
    paintWheel(wsh.g, W, true);
    wsh.el.className = "vd-wheel-shadow";
    doorEl.appendChild(wsh.el);
    var wh = mkCanvas(W * 2, W * 2, dpr);
    paintWheel(wh.g, W, false);
    wh.el.className = "vd-wheel";
    doorEl.appendChild(wh.el);
    var DR = W * 0.2;
    var dl = mkCanvas(DR * 2, DR * 2, dpr);
    paintDial(dl.g, DR);
    dl.el.className = "vd-dial";
    doorEl.appendChild(dl.el);

    var bolts = Array.prototype.slice.call(doorEl.querySelectorAll(".vd-bolt"));
    wsh.el.style.transform = "translate(-50%,-50%) translate(" + (R * 0.045).toFixed(1) + "px," + (R * 0.07).toFixed(1) + "px) translateZ(1px)";

    // rays
    // rays are soft: paint at half resolution and let CSS scale them up (cheap to composite)
    var RS = Math.round(Math.max(vw, vh) * 0.75);
    var rc = mkCanvas(RS, RS, 1);
    paintRays(rc.g, RS / 2, tint);
    rc.el.style.width = RS * 2 + "px";
    rc.el.style.height = RS * 2 + "px";
    rays.appendChild(rc.el);

    // dust
    var dctx = dust.getContext("2d");
    dust.width = Math.round(vw); dust.height = Math.round(vh);
    var sprite = mkCanvas(24, 24, 1);
    var sg = sprite.g.createRadialGradient(12, 12, 0, 12, 12, 12);
    sg.addColorStop(0, "rgba(255,255,255,1)"); sg.addColorStop(0.25, rgba(mix(tint, [255, 255, 255], 0.6), 0.6)); sg.addColorStop(1, rgba(tint, 0));
    sprite.g.fillStyle = sg; sprite.g.fillRect(0, 0, 24, 24);
    var rnd = rng(5);
    var motes = [];
    var NM = phone ? 70 : 150;
    for (var q = 0; q < NM; q++) {
      var ang2 = rnd() * Math.PI * 2, rad = Math.pow(rnd(), 0.7) * R * 2.4;
      motes.push({ x: Math.cos(ang2) * rad, y: Math.sin(ang2) * rad * 0.8, z: 0.4 + rnd() * 1.6, vx: (rnd() - 0.5) * 0.012, vy: -0.004 - rnd() * 0.012, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.6 });
    }

    var raf = 0, t0 = 0, done = false, lastT = 0;
    var cx = vw / 2, cy = vh / 2;

    var held = false;
    function frame(now) {
      if (done || held) return;
      if (!t0) t0 = now;
      var t = now - t0;
      apply(t, now - (lastT || now));
      lastT = now;
      if (t >= T.end) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }

    function apply(t, dt) {
      // caption
      var capA = outCubic(seg(t, T.capIn[0], T.capIn[1])) * (1 - seg(t, T.capOut[0], T.capOut[1]));
      caption.style.opacity = capA.toFixed(3);
      caption.style.transform = "translate(-50%," + lerp(10, 0, outCubic(seg(t, T.capIn[0], T.capIn[1]))).toFixed(1) + "px)";
      // dial: a three-number combination (right, left, right)
      var d1 = inOutCubic(seg(t, T.dial[0], T.dial[0] + 300)), d2 = inOutCubic(seg(t, T.dial[0] + 300, T.dial[0] + 540)), d3 = inOutCubic(seg(t, T.dial[0] + 540, T.dial[1]));
      var dialA = d1 * 250 - d2 * 150 + d3 * 95;
      // wheel: heavy quarter-plus turn with a small settle
      var wp = seg(t, T.wheel[0], T.wheel[1]);
      var wheelA = -inOutCubic(wp) * 300 + Math.sin(clamp01((t - T.wheel[1]) / 260) * Math.PI) * 4 * (t > T.wheel[1] ? 1 : 0);
      wh.el.style.transform = "translate(-50%,-50%) translateZ(" + wheelZ + "px) rotate(" + wheelA.toFixed(2) + "deg)";
      wsh.el.style.transform = "translate(-50%,-50%) translate(" + (R * 0.045).toFixed(1) + "px," + (R * 0.07).toFixed(1) + "px) translateZ(1px) rotate(" + wheelA.toFixed(2) + "deg)";
      dl.el.style.transform = "translate(-50%,-50%) translateZ(" + (wheelZ + 2) + "px) rotate(" + (wheelA + dialA).toFixed(2) + "deg)";
      // bolts: staggered, accelerating into a hard stop
      for (var i = 0; i < bolts.length; i++) {
        var st = T.bolts[0] + (i % 4) * 45 + Math.floor(i / 4) * 25;
        var bp = inCubic(seg(t, st, st + (T.bolts[1] - T.bolts[0]) * 0.72));
        var rr = R - boltLen * 0.42 - bp * boltLen * 0.66;
        bolts[i].style.transform = "rotate(" + bolts[i].dataset.a + "deg) translateX(" + rr.toFixed(2) + "px) translateZ(" + (-T3 * 0.45).toFixed(1) + "px)";
      }
      // clunk: damped shake
      var sx = 0, sy = 0;
      if (t > T.clunk && t < T.clunk + 360) {
        var k = (t - T.clunk) / 1000;
        var amp = (phone ? 2.2 : 3.4) * Math.exp(-k * 14);
        sx = Math.sin(k * 190) * amp; sy = Math.cos(k * 150) * amp * 0.7;
      }
      // pop + swing
      var pp = outQuart(seg(t, T.pop[0], T.pop[1]));
      var sp = inOutCubic(seg(t, T.swing[0], T.swing[1]));
      var swingDeg = -sp * 72;
      var popZ = pp * R * 0.05 + sp * R * 0.08;
      doorEl.style.transform = "translate(-50%,-50%) translate3d(0,0," + popZ.toFixed(1) + "px) rotateY(" + swingDeg.toFixed(2) + "deg)";
      // light
      var L = 0.22 * pp * (1 - sp) + inQuad(sp) * 0.2 + sp * 0.8;
      L = clamp01(L);
      seam.style.opacity = (pp * (1 - seg(sp, 0, 0.35))).toFixed(3);
      core.style.opacity = (0.25 + 0.75 * L).toFixed(3);
      core.style.transform = "scale(" + (0.85 + 0.25 * L).toFixed(3) + ")";
      spill.style.opacity = (L * 0.9).toFixed(3);
      beam.style.opacity = (L * 0.95).toFixed(3);
      rays.style.transform = "translate(-50%,-50%) rotate(" + (t * 0.004).toFixed(2) + "deg) scale(" + (0.8 + 0.3 * L).toFixed(3) + ")";
      // camera push through the opening
      var pu = inCubic(seg(t, T.push[0], T.push[1]));
      var sc = 1 + pu * (phone ? 5 : 4.2);
      cam.style.transform = "translate(" + sx.toFixed(2) + "px," + sy.toFixed(2) + "px) scale(" + sc.toFixed(3) + ")";
      beam.style.transform = "scale(" + (1 + pu * 1.6).toFixed(3) + ")";
      // bloom and fade to the room
      var bl = inOutSine(seg(t, T.bloom[0], T.bloom[1]));
      bloom.style.opacity = bl.toFixed(3);
      var fa = seg(t, T.fade[0], T.fade[1]);
      root.style.opacity = (1 - outCubic(fa)).toFixed(3);
      if (fa > 0 && !root.classList.contains("vd-leaving")) { root.classList.add("vd-leaving"); arrive(); }
      // dust
      drawDust(t, dt, L * (1 - bl * 0.6), sc);
    }

    function drawDust(t, dt, L, sc) {
      dctx.clearRect(0, 0, dust.width, dust.height);
      if (L < 0.02) return;
      dctx.globalCompositeOperation = "lighter";
      var step = Math.min(48, dt || 16);
      for (var i = 0; i < motes.length; i++) {
        var p = motes[i];
        p.x += p.vx * step * R * 0.01 * p.z;
        p.y += p.vy * step * R * 0.01 * p.z;
        if (p.y < -R * 2.2) p.y = R * 2.2;
        var zs = 1 + (sc - 1) * p.z * 0.6;
        var x = cx + p.x * zs, y = cy + p.y * zs;
        var dist = Math.sqrt(p.x * p.x + p.y * p.y) / (R * 2.4);
        var tw = 0.55 + 0.45 * Math.sin(t * 0.002 * p.sp + p.ph);
        var a = L * tw * Math.max(0, 1 - dist) * 0.9;
        if (a < 0.02) continue;
        var size = (1.2 + p.z * 2.2) * Math.min(3, zs * 0.6 + 0.4);
        dctx.globalAlpha = a;
        dctx.drawImage(sprite.el, x - size, y - size, size * 2, size * 2);
      }
      dctx.globalAlpha = 1;
    }

    var arrived = false;
    function arrive() {
      if (arrived) return;
      arrived = true;
      var vx = document.getElementById("vx-root");
      if (vx) { vx.classList.remove("vx-arrive"); void vx.offsetWidth; vx.classList.add("vx-arrive"); }
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault(); e.stopPropagation(); skip();
      }
    }
    function onVis() { if (document.hidden && !held) finish(); }
    var mo = null;
    var pane = document.getElementById("pane-vault");
    if (pane && window.MutationObserver) {
      mo = new MutationObserver(function () { if (!pane.classList.contains("active")) finish(); });
      mo.observe(pane, { attributes: true, attributeFilter: ["class"] });
    }

    var skipping = false;
    function skip() {
      if (done || skipping) return;
      skipping = true;
      cancelAnimationFrame(raf);
      arrive();
      root.classList.add("vd-skipping");
      setTimeout(finish, 260);
    }

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVis);
      if (mo) mo.disconnect();
      arrive();
      if (root.parentNode) root.parentNode.removeChild(root);
      door = null;
      try { window.dispatchEvent(new CustomEvent("titan:vault-door", { detail: { phase: "done" } })); } catch (e) { /* old browsers */ }
    }

    root.addEventListener("pointerdown", function (e) { e.preventDefault(); skip(); });
    skipBtn.addEventListener("click", skip);

    return {
      start: function () {
        document.body.appendChild(root);
        document.addEventListener("keydown", onKey, true);
        document.addEventListener("visibilitychange", onVis);
        apply(0, 16);
        // phases for the sound/fx engine (optional listeners)
        var ev = function (phase, at) { setTimeout(function () { if (!done) { try { window.dispatchEvent(new CustomEvent("titan:vault-door", { detail: { phase: phase } })); } catch (e) { /* noop */ } } }, at); };
        ev("start", 0); ev("dial", T.dial[0]); ev("wheel", T.wheel[0]); ev("bolts", T.bolts[0]); ev("clunk", T.clunk); ev("swing", T.swing[0]); ev("light", T.push[0]);
        raf = requestAnimationFrame(frame);
      },
      skip: skip,
      finish: finish,
      // test hook: freeze the timeline at t ms (used by the headless checks)
      hold: function (t) { held = true; cancelAnimationFrame(raf); lastT = 0; apply(t, 16); },
    };
  }

  window.TitanVaultWing = {
    render: render,
    playDoor: function () { playDoor({ force: true }); },
    replayDoor: function () {
      if (door) door.finish();
      var pane = document.getElementById("pane-vault");
      if (pane && !pane.classList.contains("active") && typeof window.setWing === "function") {
        memPlayed = true; // setWing re-renders; don't double-trigger
        window.setWing("vault");
      }
      playDoor({ force: true });
    },
    skipDoor: function () { if (door) door.skip(); },
    _hold: function (t) { if (door) door.hold(t); return !!door; },
    _model: function () { return model(window.vault || {}); },
  };
})();
