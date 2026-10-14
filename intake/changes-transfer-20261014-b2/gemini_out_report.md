# Atmosphere audit · 2026-10-12T23:39:02.064Z

Wings: hall, gallery, vault, study, lab · viewports: desktop, phone · static only

## Registry drift

- pre-paint list extra: none; missing: none
- ATMOS missing: none

## Per-theme summary

| theme | text fails | fail sigs | min ratio | pair fails | small<7:1 | missing required | missing semantic | swatch | crest | card | pre-paint |
|---|---|---|---|---|---|---|---|---|---|---|---|
| afterhours | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| conservator | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| colossus | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| nocturne | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| odyssey | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| cursedwing | - | - | - | - | - | 0 | 0 | y | y | y | y |
| kaleido | - | - | - | - | - | 0 | 0 | y | y | y | y |
| abyss | - | - | - | - | - | 0 | 0 | y | y | y | y |
| neon | - | - | - | - | - | 0 | 0 | y | y | y | y |
| notepad | - | - | - | - | - | 0 | 0 | y | y | y | y |
| construct | - | - | - | - | - | 0 | 0 | y | y | y | y |
| xeno | - | - | - | - | - | 0 | 0 | y | y | y | y |
| solaris | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| alchemist | - | - | - | - | - | 0 | 0 | y | y | y | y |
| glacier | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| valhalla | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| dynasty | - | - | - | - | - | 0 | 0 | y | y | y | y |
| zen | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| samadhi | - | - | - | - | - | 0 | 0 | y | y | y | y |
| silkroad | - | - | - | - | - | 0 | 0 | y | y* | y | y |
| arcade | - | - | - | - | - | 0 | 0 | y | y | y | y |
| pulp | - | - | - | - | - | 0 | 0 | y | y | y | y |
| drafting | - | - | - | - | - | 0 | 0 | y | y | y | y |
| diorama | - | - | - | - | - | 0 | 0 | y | y | y | y |
| bauhaus | - | - | - | - | - | 0 | 0 | y | y | y | y |
| terminal | - | - | - | - | - | 0 | 0 | y | y | y | y |

**Totals:** text contrast fails - (unique signatures -), token-pair fails -, missing required tokens 0, hard-coded CSS literals 601 (text 135), app.js literal lines 68

## Missing tokens vs other themes (non-contract extras)

- afterhours: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- conservator: --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- colossus: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- nocturne: --case-bg --case-bg2 --case-surface --case-surface2 --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- odyssey: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- cursedwing: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- kaleido: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- abyss: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- neon: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- notepad: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- construct: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- xeno: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- solaris: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- alchemist: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- glacier: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- valhalla: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- dynasty: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- zen: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- samadhi: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- silkroad: --ink-soft --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --chip --panel --text --gold-dim --danger --missing --border --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- arcade: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- pulp: --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- drafting: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow
- diorama: --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --ui-grid --ui-grid2 --bh-blue --bh-yellow
- bauhaus: --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green
- terminal: --case-bg --case-bg2 --case-surface --case-surface2 --deco --deco-soft --k-amethyst --k-teal --k-brass --k-plum --k-rule --k-rule-v --abyss-brass --abyss-brass-deep --neon-cyan --neon-pink --neon-violet --neon-sun1 --neon-cyan-rgb --neon-pink-rgb --inv-bg --inv-bg2 --inv-surface --inv-surface2 --ui-bw --ui-edge --ui-hard --sol-tl --sol-tr --sol-bl --sol-br --glass-bg --glass-bg2 --glass-edge --glass-blur --px-teal --px-pink --comic-yellow --comic-blue --ui-dot --case-ink --case-muted --case-faint --case-gold --case-gold-soft --case-on-gold --paper-bg --paper-bg2 --paper-surface --paper-surface2 --paper-ink --paper-muted --paper-faint --paper-gold --paper-gold-soft --paper-on-gold --ui-grid --ui-grid2 --clay-pink --clay-blue --clay-yellow --clay-green --bh-blue --bh-yellow

## app.js lines with literal colours (for wing owners)

- app.js:957 `rimStroke = "#fef08a";`
- app.js:958 `reliefFill = "#fef08a";`
- app.js:959 `reliefStroke = "rgba(254, 240, 138, 0.85)";`
- app.js:962 `rimStroke = "#fed7aa";`
- app.js:963 `reliefFill = "#fed7aa";`
- app.js:964 `reliefStroke = "rgba(254, 215, 170, 0.85)";`
- app.js:967 `rimStroke = "#f8fafc";`
- app.js:968 `reliefFill = "#ffffff";`
- app.js:969 `reliefStroke = "rgba(255, 255, 255, 0.85)";`
- app.js:972 `rimStroke = "#f1f5f9";`
- app.js:973 `reliefFill = "#f1f5f9";`
- app.js:974 `reliefStroke = "rgba(241, 245, 249, 0.85)";`
- app.js:1003 `<circle cx="50" cy="50" r="48" fill="none" stroke="rgba(200,169,74,0.15)" stroke-width="0.75"/>`
- app.js:1004 `<circle cx="50" cy="50" r="47.2" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/>`
- app.js:1007 `<circle cx="50" cy="50" r="${scaledR.toFixed(1)}" fill="url(#${gradId})" stroke="#050608" stroke-width="0.8" filter="url(#pl-shadow-${uid})"/>`
- app.js:2681 `<button type="button" class="btn small" id="cf-btn-dossier" style="border-color:rgba(200,169,74,0.4)">Inspect Dossier →</button>`
- app.js:2733 `stage.innerHTML = '<p class="empty" style="color:#94a3b8;padding:2rem 0">No specimens match current criteria</p>';`
- app.js:2735 `if (placard) placard.innerHTML = '<span style="color:#94a3b8">No specimens</span>';`
- app.js:3093 `<button type="button" class="btn small" id="cf-btn-spatial" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gold`
- app.js:3094 `<button type="button" class="btn small" id="cf-btn-deepzoom" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gol`
- app.js:3315 `${flipFilter.staging ? '<button type="button" class="btn small active" id="flip-staging-clear" style="background:var(--gold);color:#08090c;font-weight`
- app.js:3318 `${(flipFilter.iso || flipFilter.country) ? '<button type="button" class="btn small" id="flip-return-atlas" style="border:1px solid var(--gold);color:v`
- app.js:3824 `${spotTileHtml("SILVER (XAG/OZ)", "PRIMARY", "background:rgba(200,169,74,0.15);color:var(--gold);font-size:0.65rem", spotAg, "$" + spotAg.toFixed(2), `
- app.js:3825 `${spotTileHtml("GOLD (XAU/OZ)", "RESERVE", "background:rgba(234,179,8,0.15);color:#eab308;font-size:0.65rem", spotAu, "$" + spotAu.toFixed(2), priorAu`
- app.js:3826 `${spotTileHtml("GOLD / SILVER RATIO", "GSR", "background:rgba(6,182,212,0.15);color:#06b6d4;font-size:0.65rem", parseFloat(gsRatio), gsRatio + ":1", p`
- app.js:3828 `<div class="spot-metal-label"><span>BULLION BOARD Δ</span><span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-size:0.65rem"`
- app.js:3839 `Directly custodying <strong style="color:var(--gold)">${num(totalAgOz, 2)} oz pure silver</strong> and <strong style="color:#eab308">${num(totalAuOz, `
- app.js:3884 `<div style="font-family:var(--mono);font-size:1.6rem;font-weight:700;color:#94a3b8">${money(totalPhysicalMelt)}</div>`
- app.js:3893 `<div style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:#10b981">+${money(Math.max(0, totalEst - totalPhysicalMelt))}</div>`
- app.js:3897 `<div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;display:flex">`
- app.js:3898 `<div style="width:${totalEst > 0 ? ((totalPhysicalMelt / totalEst) * 100).toFixed(1) : 0}%;background:linear-gradient(90deg,#64748b,#94a3b8);border-ra`
- app.js:3899 `<div style="flex:1;background:linear-gradient(90deg,#c8a94a,#eab308);border-radius:0 4px 4px 0" title="Numismatic premium"></div>`
- app.js:3916 `return '<div class="ss-segment" style="width:${Math.max(0.5, pct).toFixed(2)}%;background:rgba(148,163,184,${(intensity / 100).toFixed(2)})" data-scan`
- app.js:4405 `<div class="lab-card-pro reveal" id="phase2-staging-card" style="border:1px solid var(--gold);background:linear-gradient(135deg, rgba(200,169,74,0.08)`
- app.js:4409 `<span class="badge" style="font-family:var(--mono);font-size:0.75rem;background:var(--gold);color:#08090c;font-weight:700">PHYSICAL STAGING DIRECTORY<`
- app.js:4410 `<span class="badge" style="font-family:var(--mono);font-size:0.7rem;background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gol`
- app.js:4427 `<div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(0,0,0,0.4);border-radius:8px;border:1px dashed rgba(200,169,74,0.35);display:flex;ali`
- app.js:4429 `📁 <strong>Google Drive Staging Folder:</strong> <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">G:\\My Drive\\Titan`
- app.js:4438 `<div class="table-wrap" style="background:rgba(8,9,12,0.6);border-radius:8px;border:1px solid var(--line)">`
- app.js:4456 `<td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span>`
- app.js:4464 `<td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span>`
- app.js:4472 `<td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span>`
- app.js:4480 `<td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span>`
- app.js:4488 `<td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span>`
- app.js:4504 `<span class="badge" style="font-family:var(--mono);font-size:0.7rem;background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gol`
- app.js:4655 `<div id="sb-error-badge" style="font-size:0.75rem;padding:0.5rem 0.75rem;border-radius:6px;background:rgba(200,169,74,0.1);border:1px solid var(--line`
- app.js:4781 `g.strokeStyle = "rgba(255, 255, 255, 0.15)";`
- app.js:4802 `g.fillStyle = "rgba(200, 169, 74, 0.85)";`
- app.js:4812 `g.fillStyle = "#12141c";`
- app.js:4816 `g.strokeStyle = "rgba(200, 169, 74, 0.4)";`
- app.js:4824 `g.fillStyle = "rgba(200, 169, 74, 0.25)";`
- app.js:4827 `g.fillStyle = "rgba(240, 215, 140, 0.75)";`
- app.js:4836 `g.fillStyle = "rgba(240, 215, 140, 0.9)";`
- app.js:4847 `g.fillStyle = "rgba(100, 180, 255, 0.22)";`
- app.js:4850 `g.fillStyle = "rgba(180, 220, 255, 0.85)";`
- app.js:4863 `g.fillStyle = "rgba(180, 220, 255, 0.95)";`
- app.js:4868 `g.strokeStyle = "#38bdf8";`
- app.js:4875 `g.fillStyle = "#38bdf8";`
- app.js:4900 `badgeEl.innerHTML = '⚠️ <strong style="color:#f59e0b">Rotated Die Error Detected:</strong> ${rot}° (${clockH}:00). Variance is <strong>${dev}°</strong`
- app.js:4901 `badgeEl.style.borderColor = "#f59e0b";`
- app.js:5176 `<div class="album-binder-card binder-theme-gold staging-binder-card" data-album-family="${esc(g.family)}" style="border:1.5px solid var(--gold);backgr`
- app.js:5179 `<span class="badge" style="background:var(--gold);color:#08090c;font-weight:700">MACRO RIG QUEUE</span>`
- app.js:5227 `<span class="badge" style="background:rgba(255,255,255,0.08);color:var(--gold-soft);font-size:0.68rem">${cfg.maker.toUpperCase()}</span>`
- app.js:5261 `return '<tr class="staging-album-row" style="background:rgba(200,169,74,0.12);font-weight:600;cursor:pointer" title="Click to view Pro Photo Staging A`
- app.js:5308 `<button type="button" class="btn small btn-shelf-wantlist" id="btn-shelf-wantlist" style="border-color:var(--gold);color:var(--gold-soft);background:r`
- app.js:5601 `<td><span class="badge" style="background:rgba(255,255,255,0.06);color:var(--gold-soft);font-family:var(--mono);font-size:0.7rem">${esc(h.albumId)}</s`
- app.js:6360 `<div class="ds-caliper-box" style="border-color: rgba(200, 169, 74, 0.35); background: linear-gradient(180deg, rgba(22,19,16,0.9), rgba(14,13,10,0.95)`
- app.js:6890 `g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 0, w, h);`

## styles.css text colours hard-coded outside theme blocks

- styles.css:295 `.gallery-load-more-btn:hover` color: #fff
- styles.css:678 `.rain-btn[aria-pressed="true"]` color: #7db4d8
- styles.css:740 `.tab.active` color: #1c1508
- styles.css:1202 `.filter-ag.active` color: #e8eef4
- styles.css:1320 `.badge-ag` color: #d0d6de
- styles.css:1350 `.badge-review, .ph-badge.review` color: #f0b8ac
- styles.css:1351 `.asw-cell` color: #c0c8d0
- styles.css:1543 `.chip.ag strong` color: #c0c8d0
- styles.css:1882 `.lofi-bar.collapsed .lofi-play` color: #0c0b08
- styles.css:2043 `.amb-reverb-btn:hover` color: #fff
- styles.css:2244 `body` color: #000
- styles.css:2247 `.wordmark, .hero-grand` color: #000 !important
- styles.css:2258 `a` color: #000
- styles.css:2399 `.wing.wing-3d:hover` color: #fff
- styles.css:2413 `.wing-badge-3d` color: #08090c
- styles.css:2447 `.hero-spatial-launcher:hover` color: #fff
- styles.css:2462 `.hero-spatial-launcher .hsl-pill` color: #08090c
- styles.css:2522 `.gsc-title` color: #fff
- styles.css:2540 `.gsc-btn` color: #fff
- styles.css:2596 `.lab-badge` color: #0b0a08
- styles.css:3549 `.rain-btn[aria-pressed="true"]` color: #9cc8e8
- styles.css:3900 `.lofi-btn[data-act="ambience"].on` color: #7db4d8
- styles.css:4376 `.seg-ag` color: #1a2530
- styles.css:4381 `.seg-au` color: #3e2723
- styles.css:4386 `.seg-numis` color: #ffffff
- styles.css:4423 `.leg-ag .dot` color: #b8c8d8
- styles.css:4424 `.leg-au .dot` color: #ffc107
- styles.css:4425 `.leg-numis .dot` color: #7986cb
- styles.css:4497 `.ex-nav-btn:hover` color: #08090c
- styles.css:4564 `.ex-medallion` color: #1a222a
- styles.css:4579 `.ex-medallion.is-gold` color: #3e2723
- styles.css:4764 `.flip-aero-header` color: #e2e8f0
- styles.css:4771 `.flip-aero-country` color: #fff
- styles.css:4784 `.flip-aero-ser` color: #94a3b8
- styles.css:4797 `.flip-aero-footer` color: #cbd5e1
- styles.css:4804 `.flip-aero-denom` color: #fff
- styles.css:4812 `.flip-aero-purity` color: #93c5fd
- styles.css:4908 `.flip-holo-text` color: #fff
- styles.css:5024 `.gsb-title` color: #fff
- styles.css:5030 `.gsb-sub` color: #94a3b8
- styles.css:5041 `.gsb-btn` color: #fff
- styles.css:5058 `.gsb-badge` color: #fef08a
- styles.css:5110 `.specimen-blueprint .bp-txt-iso` fill: #f1f5f9
- styles.css:5123 `.specimen-blueprint .bp-txt-alloy` fill: #94a3b8
- styles.css:5131 `.specimen-blueprint .bp-txt-stamp` fill: rgba(200, 169, 74, 0.45)
- styles.css:5253 `.placard-inspect-btn:hover` color: #0b0a08
- styles.css:5284 `.pc-ag-pill` color: #d8e2ec
- styles.css:5457 `.ds-caliper-dim-tag` color: #0b0f19
- styles.css:5555 `.sim-toggle-badge.gain` color: #86efac
- styles.css:5560 `.sim-toggle-badge.loss` color: #fca5a5
- styles.css:5624 `.sim-stat-delta.gain` color: #4ade80
- styles.css:5625 `.sim-stat-delta.loss` color: #f87171
- styles.css:5778 `.tray-tab.active` color: #0b0a08
- styles.css:5793 `.tray-tab.active .tray-count` color: #ffffff
- styles.css:5891 `.ticker-live-lbl` color: #f87171
- styles.css:5916 `.ticker-item` color: #cbd5e1
- styles.css:5923 `.ticker-item:hover` color: #ffffff
- styles.css:5931 `.ticker-item .tk-price` color: #f1f5f9
- styles.css:5944 `.tk-tag.tk-up` color: #4ade80
- styles.css:5949 `.tk-tag.tk-down` color: #f87171
- styles.css:5954 `.tk-tag.tk-neu` color: #cbd5e1
- styles.css:5996 `.term-live-badge` color: #4ade80
- styles.css:6030 `.term-price.flash-up` color: #4ade80 !important
- styles.css:6035 `.term-price.flash-down` color: #f87171 !important
- styles.css:6044 `.term-delta.up` color: #4ade80
- styles.css:6045 `.term-delta.down` color: #f87171
- styles.css:6072 `.term-asset-btn.active` color: #0c0b08
- styles.css:6141 `.term-mode-btn.active` color: #0c0b08
- styles.css:6186 `.hud-chg.up` color: #4ade80
- styles.css:6187 `.hud-chg.down` color: #f87171
- styles.css:6352 `.ex-ctrl-btn.active` color: #0c0b08
- styles.css:6361 `.ex-ctrl-btn.flip-btn:hover` color: #0c0b08
- styles.css:6468 `.slab-pedigree-holo` color: #fff
- styles.css:6495 `.slab-pedigree-title` color: #f8fafc
- styles.css:6538 `.slab-pedigree-metal` color: #93c5fd
- styles.css:6548 `.slab-barcode-strip` color: #94a3b8
- styles.css:6773 `.loupe-badge` color: #38bdf8
- styles.css:6784 `.loupe-coords` color: #f0fdf4
- styles.css:6844 `.ex-copy-fn-btn:hover` color: #ffffff
- styles.css:6852 `.ex-ctrl-btn#btn-ex-reticle.active` color: #e0f2fe
- styles.css:6913 `.ret-axis-lbl` color: #7dd3fc
- styles.css:6966 `.caliper-hud-header` color: #7dd3fc
- styles.css:7020 `.cal-lcd-sym` color: #38bdf8
- styles.css:7027 `.cal-lcd-val` color: #f0fdf4
- styles.css:7034 `.cal-lcd-unit` color: #86efac
- styles.css:7052 `.cm-tag` color: #cbd5e1
- styles.css:7062 `.cm-info-btn` color: #38bdf8
- styles.css:7072 `.cm-info-btn:hover` color: #ffffff
- styles.css:7097 `.caliper-pop-box` color: #e2e8f0
- styles.css:7106 `.caliper-pop-close` color: #fff
- styles.css:7115 `.caliper-pop-title` color: #38bdf8
- styles.css:7124 `.caliper-pop-body` color: #cbd5e1
- styles.css:7127 `.caliper-pop-body strong` color: #f8fafc
- styles.css:7435 `.calc-diffraction-alert` color: #f59e0b
- styles.css:7674 `.museum-slab.slab-mini .slab-barcode-strip` color: #94a3b8
- styles.css:7865 `.cf-header-left .cf-title` color: #fff
- styles.css:7884 `.cf-header-actions .btn` color: #e2e8f0
- styles.css:7895 `.cf-header-actions .btn:hover` color: #fff
- styles.css:8088 `.cf-flip-badge:hover` color: #fff
- styles.css:8157 `.cf-placard-title` color: #fff
- styles.css:8162 `.cf-placard-meta` color: #94a3b8
- styles.css:8195 `.cf-nav-btn` color: #fff
- styles.css:8275 `.cf-counter` color: #94a3b8
- styles.css:8465 `.atlas-cam-btn.active` color: #08090c !important
- styles.css:8515 `.atlas-route-btn.active` color: #08090c !important
- styles.css:8759 `.study-nav-pill.active` color: #08090c
- styles.css:8889 `.atlas-node:hover .atlas-node-core, .atlas-node:focus-visible .atlas-node-core` fill: #ffffff !important
- styles.css:8897 `.atlas-node:hover .atlas-node-halo, .atlas-node:focus-visible .atlas-node-halo` fill: rgba(200, 169, 74, 0.45) !important
- styles.css:8902 `.atlas-node.selected .atlas-node-core` fill: #ffffff !important
- styles.css:8909 `.atlas-node.selected .atlas-node-halo` fill: rgba(254, 240, 138, 0.38) !important
- styles.css:8990 `.spot-live-pill` color: #34d399
- styles.css:9058 `.spot-metal-delta.up` color: #34d399
- styles.css:9062 `.spot-metal-delta.down` color: #f87171
- styles.css:9210 `.spatial-close-btn:hover` color: #08090c
- styles.css:9251 `.spatial-flip-btn` color: #08090c !important
- styles.css:9270 `.spatial-hint-pill` color: rgba(200, 169, 74, 0.7)
- styles.css:9842 `.album-flip-page-btn:hover` color: #fff
- styles.css:9972 `.slot-hole-target-cross` color: rgba(200, 169, 74, 0.4)
- styles.css:9981 `.slot-hole-lbl` color: rgba(200, 169, 74, 0.7)
- styles.css:10019 `.slot-status-pill.filled` color: #34d399
- styles.css:10025 `.slot-status-pill.missing` color: #f87171
- styles.css:10279 `.binder-btn-open:hover` color: #08090c
- styles.css:10291 `.binder-btn-holes:hover` color: #f87171
- styles.css:10371 `.wantlist-target-badge.key` color: #f87171
- styles.css:10529 `.pc-flip-action-btn:hover, .cf-flip-badge:hover` color: #fff
- styles.css:10567 `.slab-footer-melt` color: #94a3b8
- styles.css:10581 `.slab-footer-seal-text` color: rgba(200, 169, 74, 0.85)
- styles.css:10867 `.bullion-round::after` color: rgba(0, 0, 0, 0.35)
- styles.css:10896 `.bullion-bar-stamp` color: #1c2330
- styles.css:10905 `.bullion-bar-weight` color: #141a26
- styles.css:10931 `.bullion-gold-disc::after` color: rgba(0, 0, 0, 0.3)
- styles.css:10962 `.bullion-mint-box-label` color: #ecd9a0
- styles.css:11030 `.bullion-lot-purity.ag` color: #cbd5e1
- styles.css:11035 `.bullion-lot-purity.au` color: #fbbf24
- styles.css:11566 `body.print-reshoot #reshoot, body.print-reshoot #reshoot *` color: #000 !important
