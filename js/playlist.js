/* Titan Reliquary — music stations (static, outside data/ so publish_all.sh cannot clobber it).
   Tracks are HOTLINKED mp3s (Kevin MacLeod, incompetech.com, CC-BY 4.0 — credit
   shown in the player UI). They are not committed to the repo and will not work
   offline (see CHANGELOG.md). Every URL below was verified with an HTTP 200
   check on 2026-09-25. Edit by hand to swap tracks.
   TITAN_PLAYLIST is kept as an alias of the lofi station for back-compat. */
(function () {
  "use strict";
  const M = (title, file) => ({
    title,
    artist: "Kevin MacLeod",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + file,
    license: "CC-BY",
    credit: "\u201C" + title + "\u201D Kevin MacLeod (incompetech.com) \u2014 CC BY 4.0",
  });

  window.TITAN_STATIONS = {
    lofi: {
      name: "Lofi",
      tag: "midnight study beats",
      tracks: [
        M("Ultralounge", "Ultralounge.mp3"),
        M("Chill Wave", "Chill%20Wave.mp3"),
        M("Chillin Hard", "Chillin%20Hard.mp3"),
        M("Suave Standpipe", "Suave%20Standpipe.mp3"),
        M("Ice Flow", "Ice%20Flow.mp3"),
        M("Soporific", "Soporific.mp3"),
        M("Kool Kats", "Kool%20Kats.mp3"),
        M("Mirage", "Mirage.mp3"),
        M("Local Forecast - Slower", "Local%20Forecast%20-%20Slower.mp3"),
        M("Disco Lounge", "Disco%20Lounge.mp3"),
        M("Easy Jam", "Easy%20Jam.mp3"),
        M("Airship Serenity", "Airship%20Serenity.mp3"),
      ],
    },
    classical: {
      name: "Classical",
      tag: "the conservator's desk",
      tracks: [
        M("Gymnopedie No 1", "Gymnopedie%20No%201.mp3"),
        M("Meditation Impromptu 01", "Meditation%20Impromptu%2001.mp3"),
        M("Meditation Impromptu 02", "Meditation%20Impromptu%2002.mp3"),
        M("Meditation Impromptu 03", "Meditation%20Impromptu%2003.mp3"),
        M("Thinking Music", "Thinking%20Music.mp3"),
        M("Agnus Dei X", "Agnus%20Dei%20X.mp3"),
      ],
    },
    epic: {
      name: "Epic",
      tag: "bronze and thunder",
      tracks: [
        M("Five Armies", "Five%20Armies.mp3"),
        M("Stormfront", "Stormfront.mp3"),
        M("Clash Defiant", "Clash%20Defiant.mp3"),
        M("Heroic Age", "Heroic%20Age.mp3"),
        M("Impact Prelude", "Impact%20Prelude.mp3"),
        M("Constance", "Constance.mp3"),
      ],
    },
    jazz: {
      name: "Jazz",
      tag: "smoke and saxophone",
      tracks: [
        M("Night on the Docks - Sax", "Night%20on%20the%20Docks%20-%20Sax.mp3"),
        M("Deuces", "Deuces.mp3"),
        M("Smooth Lovin", "Smooth%20Lovin.mp3"),
        M("Dances and Dames", "Dances%20and%20Dames.mp3"),
        M("I Knew a Guy", "I%20Knew%20a%20Guy.mp3"),
        M("Off to Osaka", "Off%20to%20Osaka.mp3"),
      ],
    },
    adventure: {
      name: "Adventure",
      tag: "maps and far horizons",
      tracks: [
        M("Expeditionary", "Expeditionary.mp3"),
        M("The Path of the Goblin King", "The%20Path%20of%20the%20Goblin%20King.mp3"),
        M("To the Ends", "To%20the%20Ends.mp3"),
        M("Investigations", "Investigations.mp3"),
        M("The Descent", "The%20Descent.mp3"),
        M("The Pyre", "The%20Pyre.mp3"),
      ],
    },
    dark: {
      name: "Dark",
      tag: "do not tap the glass",
      tracks: [
        M("Oppressive Gloom", "Oppressive%20Gloom.mp3"),
        M("Darkest Child", "Darkest%20Child.mp3"),
        M("The Dread", "The%20Dread.mp3"),
        M("Unseen Horrors", "Unseen%20Horrors.mp3"),
        M("Grim Idol", "Grim%20Idol.mp3"),
        M("Long Note One", "Long%20Note%20One.mp3"),
      ],
    },
    psych: {
      name: "Psych",
      tag: "a trip through the vault",
      tracks: [
        M("Deliberate Thought", "Deliberate%20Thought.mp3"),
        M("Lightless Dawn", "Lightless%20Dawn.mp3"),
        M("Dreamlike", "Dreamlike.mp3"),
        M("Thunder Dreams", "Thunder%20Dreams.mp3"),
        M("Spacial Harvest", "Spacial%20Harvest.mp3"),
        M("Ossuary 6 - Air", "Ossuary%206%20-%20Air.mp3"),
      ],
    },
    abyss: {
      name: "Abyss",
      tag: "pressure hymns from the wreck",
      tracks: [
        M("Montauk Point", "Montauk%20Point.mp3"),
        M("Ossuary 5 - Rest", "Ossuary%205%20-%20Rest.mp3"),
        M("Sovereign", "Sovereign.mp3"),
        M("Echoes of Time", "Echoes%20of%20Time.mp3"),
        M("Earnest", "Earnest.mp3"),
        M("Lost Frontier", "Lost%20Frontier.mp3"),
      ],
    },
    synthwave: {
      name: "Synthwave",
      tag: "midnight drive, chrome grid",
      tracks: [
        M("Electrodoodle", "Electrodoodle.mp3"),
        M("New Direction", "New%20Direction.mp3"),
        M("Funkorama", "Funkorama.mp3"),
        M("Groove Grove", "Groove%20Grove.mp3"),
        M("Disco Medusae", "Disco%20Medusae.mp3"),
        M("Bicycle", "Bicycle.mp3"),
      ],
    },
    quiet: {
      name: "Quiet",
      tag: "untitled - notepad",
      tracks: [
        M("Long Note Two", "Long%20Note%20Two.mp3"),
        M("Long Note Three", "Long%20Note%20Three.mp3"),
        M("Long Note Four", "Long%20Note%20Four.mp3"),
        M("Air Prelude", "Air%20Prelude.mp3"),
        M("Reaching Out", "Reaching%20Out.mp3"),
        M("Floating Cities", "Floating%20Cities.mp3"),
      ],
    },
    construct: {
      name: "Construct",
      tag: "machine code lullabies",
      tracks: [
        M("Mechanolith", "Mechanolith.mp3"),
        M("Industrial Cinematic", "Industrial%20Cinematic.mp3"),
        M("Volatile Reaction", "Volatile%20Reaction.mp3"),
        M("Darkling", "Darkling.mp3"),
        M("Industrial Music Box", "Industrial%20Music%20Box.mp3"),
        M("Iron Horse", "Iron%20Horse.mp3"),
      ],
    },
    xeno: {
      name: "Xeno",
      tag: "deep field transmissions",
      tracks: [
        M("Space 1990", "Space%201990.mp3"),
        M("Starry", "Starry.mp3"),
        M("Crusade", "Crusade.mp3"),
        M("Come Play with Me", "Come%20Play%20with%20Me.mp3"),
        M("Dreams Become Real", "Dreams%20Become%20Real.mp3"),
        M("Silver Blue Light", "Silver%20Blue%20Light.mp3"),
      ],
    },
  };
  window.TITAN_PLAYLIST = window.TITAN_STATIONS.lofi.tracks;
  window.TITAN_STATION_ORDER = ["lofi", "classical", "epic", "jazz", "adventure", "dark", "psych", "abyss", "synthwave", "quiet", "construct", "xeno"];
})();
