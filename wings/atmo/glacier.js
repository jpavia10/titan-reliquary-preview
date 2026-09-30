/* Crest for the Hyperborean Vault atmosphere (glacier). See wings/atmo/_template.js.
 * CREST = inner markup of a 200x200 <symbol>, currentColor only; null keeps the
 * legacy <symbol id="crest-glacier"> from index.html. */
(function () {
  var CREST = null;
  if (CREST && window.TitanAtmoCrest) window.TitanAtmoCrest("glacier", CREST);
})();
