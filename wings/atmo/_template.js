/* Crest for the NAME atmosphere (copy of the template; the stub wings/atmo/<name>.js already exists).
 * Set CREST to the INNER markup of a 200x200 <symbol>: paths/circles using
 * stroke="currentColor" / fill="currentColor" (+ opacity) so the crest follows
 * the theme colour where it is shown (hero + exhibit watermarks, cover flow).
 * Do not hard-code colours such as fill="#000"; use currentColor with opacity,
 * or style="fill: var(--bg)" for knock-outs. Keep it under ~4 KB, no <script>,
 * no external refs. Leave CREST = null to keep the symbol from index.html.
 */
(function () {
  var CREST = null;
  /* example:
  CREST = '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
          '<path d="M 60 120 L 100 50 L 140 120 Z" fill="currentColor" opacity="0.35"/>';
  */
  if (CREST && window.TitanAtmoCrest) window.TitanAtmoCrest("NAME", CREST);
})();
