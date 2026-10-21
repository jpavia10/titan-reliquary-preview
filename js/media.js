/* Titan Reliquary · where the big media lives (owner 2026-10-21: "If u need to create another site to host the music and videos go for it").
   GitHub Pages caps a site at 1 GB and this one reached 770 MB, so the opening films and the music live on their own Pages sites, under
   the SAME folder paths they had here (so the service worker, the smoke budget and the tests still recognise them by path):
     titan-films  ->  art/splash/<clip>.webm|.mp4
     titan-music  ->  audio/score/<theme>/..., audio/music/...
   GitHub Pages sends Access-Control-Allow-Origin: *, and the audio players set crossOrigin = "anonymous", so Web Audio can use them.
   On a local server (localhost / 127.0.0.1: tests, CI, development) they are read from _media/titan-films/ and _media/titan-music/,
   shallow clones of those repos (git-ignored here; .github/workflows/smoke.yml checks them out). localStorage "titan.media" =
   {"films": URL, "music": URL} overrides either base. Loaded before splash.js and every audio module.
   API: TitanMedia.url("films" | "music", "art/splash/x.webm") -> the URL to load; TitanMedia.base = { films, music } */
(function () {
  "use strict";
  if (window.TitanMedia) return;
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var B = local ? { films: "_media/titan-films/", music: "_media/titan-music/" }
                : { films: "https://jpavia10.github.io/titan-films/", music: "https://jpavia10.github.io/titan-music/" };
  try {
    var o = JSON.parse(localStorage.getItem("titan.media") || "null");
    if (o && typeof o === "object") { if (typeof o.films === "string") B.films = o.films; if (typeof o.music === "string") B.music = o.music; }
  } catch (e) { /* storage blocked: the defaults */ }
  window.TitanMedia = {
    base: B,
    url: function (kind, path) { path = String(path || ""); return /^(https?:|data:|blob:)/.test(path) ? path : (B[kind] || "") + path; }
  };
})();
