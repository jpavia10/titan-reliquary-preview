/* Titan Reliquary · collection intelligence (Study) and Phase 2 shooting sessions (Lab), split out of app.js
   (fix list #32, step 2; notes/agents/app-split.md). Pure functions of the flip list; HTML out. Loaded before app.js. */
(() => {
  "use strict";
  const { esc, money, intFmt } = window.TitanFormat;

  /* --- Collection intelligence (WS4): computed from real flip fields only. --- */
  function flipInsights(all) {
    const flips = (all || []).filter((f) => f.status !== "Removed");
    const valued = flips.map((f) => ({ f, v: f.est ?? 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const total = valued.reduce((sum, x) => sum + x.v, 0);
    const topN = valued.slice(0, 10);
    const decades = {};
    for (const f of flips) {
      const y = parseInt(f.year, 10);
      if (!Number.isFinite(y)) continue;
      const d = Math.floor(y / 10) * 10;
      decades[d] = (decades[d] || 0) + 1;
    }
    const decadeRows = Object.entries(decades).sort((a, b) => a[0] - b[0]);
    const dMax = Math.max(1, ...decadeRows.map(([, n]) => n));
    const byCountry = {};
    for (const f of flips) {
      const c = f.country || "Unknown";
      byCountry[c] = byCountry[c] || { n: 0, v: 0 };
      byCountry[c].n += 1;
      byCountry[c].v += f.est ?? 0;
    }
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    const cMax = Math.max(1, ...topCountries.map(([, x]) => x.n));
    const gems = flips
      .filter((f) => (f.est ?? 0) >= 5 && String(f.conf || "").toLowerCase() !== "high")
      .sort((a, b) => (b.est ?? 0) - (a.est ?? 0))
      .slice(0, 5);
    const agN = flips.filter((f) => f.is_silver).length;
    return { flips, valued, total, topN, decadeRows, dMax, topCountries, cMax, gems, agN };
  }
  function insightsSec(all) {
    const { total, topN, decadeRows, dMax, topCountries, cMax, gems, agN, flips } = flipInsights(all);
    if (!flips.length) return "";
    const top10 = topN.slice(0, 10);
    const share = total ? top10.reduce((sum, x) => sum + x.v, 0) / total : 0;
    const concCard = `
      <div class="insight-card reveal">
        <h3>Value concentration</h3>
        <p class="lede">Where the money actually sits.</p>
        <div class="conc-lbl">Top 10 flips hold <strong>${Math.round(share * 100)}%</strong> of flip value</div>
        <div class="conc-bar" role="img" aria-label="Top 10 flips hold ${Math.round(share * 100)} percent of flip value"><span style="width:${Math.round(share * 100)}%"></span></div>
        <div class="conc-lbl">${topN.slice(0, 3).map((x) => esc(x.f.ser || x.f.scan)).join(" · ")} lead the cabinet</div>
      </div>`;
    const decadeCard = `
      <div class="insight-card reveal">
        <h3>Age map</h3>
        <p class="lede">A century of pocket change, by decade (tap to filter gallery).</p>
        <div class="decade-bars">
          ${decadeRows.map(([d, n]) => `
            <div class="decade-row interactive-decade" data-decade="${d}" style="cursor:pointer" title="Click to filter gallery to ${d}s">
              <span class="dk">${d}s</span>
              <span class="dt"><span style="width:${Math.round((n / dMax) * 100)}%"></span></span>
              <span class="dv">${intFmt(n)}</span>
            </div>`).join("")}
        </div>
      </div>`;
    const spreadCard = `
      <div class="insight-card reveal">
        <h3>Country spread</h3>
        <p class="lede">The cabinet's passports, ranked (tap to filter gallery).</p>
        <div class="country-spread">
          ${topCountries.map(([c, x]) => `
            <div class="spread-row interactive-country-spread" data-country="${esc(c)}" style="cursor:pointer" title="Click to filter gallery to ${esc(c)}">
              <span class="sc">${esc(c)}</span>
              <span class="sv">${intFmt(x.n)} flips · ${money(x.v)}</span>
              <span class="st"><span style="width:${Math.round((x.n / cMax) * 100)}%"></span></span>
            </div>`).join("")}
        </div>
      </div>`;
    const gemCard = `
      <div class="insight-card reveal">
        <h3>Hidden gems</h3>
        <p class="lede">Worth real money, confidence still soft — verify these first.</p>
        ${gems.length ? gems.map((f) => `
          <div class="gem-row"><button type="button" data-scan="${esc(f.scan)}" title="Open the dossier">
            <span>
              ${f.thumb ? `<img src="${esc(f.thumb)}" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px;border:1px solid rgba(200,169,74,0.4)" />` : ""}
              <span class="g-id">${esc(f.ser || f.scan)}</span>
              <span class="g-why">${esc([f.country, f.year, f.denom].filter(Boolean).join(" · "))} · conf ${esc(f.conf || "—")}</span>
            </span>
            <span class="g-val">${money(f.est)}</span>
          </button></div>`).join("") : '<p class="empty">Nothing flagged — every valued flip reads high confidence.</p>'}
      </div>`;
    return `
      <div class="sec-head reveal" id="sec-intelligence"><span class="eyebrow">Collection intelligence</span><h2>The vault, thinking</h2>
      <p class="sub">Computed from the ledger — ${intFmt(flips.length)} flips · ${intFmt(agN)} silver · ${money(total)} in flips.</p></div>
      <div class="insight-grid">${concCard}${decadeCard}${spreadCard}${gemCard}</div>`;
  }

  /* --- Shooting sessions (WS3): the Phase-2 photo mission board. --- */
  function shootingData(all) {
    const live = (all || []).filter((f) => f.status !== "Removed");
    const queue = live.filter((f) => !f.phase2_done);
    const done = live.length - queue.length;
    const byCountry = {};
    for (const f of queue) {
      const c = f.country || "Unknown";
      (byCountry[c] = byCountry[c] || []).push(f);
    }
    const groups = Object.entries(byCountry)
      .map(([country, arr]) => ({
        country, n: arr.length,
        value: arr.reduce((sum, f) => sum + (f.est ?? 0), 0),
        silver: arr.filter((f) => f.is_silver).length,
      }))
      .sort((a, b) => b.n - a.n);
    return { live, queue, done, groups };
  }
  function shootingSec(all) {
    const { live, queue, done, groups } = shootingData(all);
    if (!live.length) return "";
    const pct = live.length ? Math.round((done / live.length) * 100) : 0;
    const top = groups.slice(0, 6);
    return `
      <div class="sec-head reveal"><span class="eyebrow">Photo lab</span><h2>Shooting sessions</h2>
      <p class="sub">Phase 2, one country at a time — highest count first.</p></div>
      <div class="shoot-progress reveal">
        <div class="sp-top"><h3>The archive so far</h3>
        <span class="sp-n">${intFmt(done)} of ${intFmt(live.length)} flips photographed · ${pct}%</span></div>
        <div class="shoot-bar" role="img" aria-label="${pct} percent photographed"><span style="width:${pct}%"></span></div>
        ${done === 0 ? '<p class="sub" style="margin:0.6rem 0 0">The archive is empty — Phase 2 begins the shoot. Pick a country below to start a session.</p>' : ""}
      </div>
      <div class="shoot-grid">
        ${top.map((g) => `
          <div class="shoot-card reveal">
            <div class="sh-c">${esc(g.country)}</div>
            <div class="sh-n"><strong>${intFmt(g.n)}</strong> awaiting · ${money(g.value)} on the table${g.silver ? ` · ${g.silver} silver` : ""}</div>
            <button type="button" class="btn small" data-session="${esc(g.country)}">Start session →</button>
          </div>`).join("")}
      </div>`;
  }

  window.TitanInsights = { flipInsights, insightsSec, shootingData, shootingSec };
})();
