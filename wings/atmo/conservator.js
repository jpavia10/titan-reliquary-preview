/* Crest for the Conservator atmosphere (conservator). See wings/atmo/_template.js.
 * CREST = inner markup of a 200x200 <symbol>, currentColor only; null keeps the
 * legacy <symbol id="crest-conservator"> from index.html. */
(function () {
  var CREST = null;
  if (CREST && window.TitanAtmoCrest) window.TitanAtmoCrest("conservator", CREST);
})();
