import os, re, math

REQUIRED_TOKENS = [
    '--bg', '--bg2', '--surface', '--surface2', '--ink', '--muted', '--faint',
    '--cardmeta', '--gold', '--gold-soft', '--gold-deep', '--line', '--line-strong',
    '--ok', '--warn', '--bad', '--shadow', '--th-bg', '--tabgrad1', '--tabgrad2',
    '--toastgrad1', '--toastgrad2', '--foot-bg', '--drawerbar-bg', '--ph-bg',
    '--sel-bg', '--row-hover', '--hold-bg', '--skeleton1', '--skeleton2'
]

def parse_color(c):
    if not c: return None
    c = c.strip()
    if c.startswith('#'):
        h = c[1:]
        if len(h) == 3: h = ''.join([x*2 for x in h])
        if len(h) == 6:
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
            return (r, g, b, 1.0)
        elif len(h) == 8:
            r, g, b, a = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16)/255.0
            return (r, g, b, a)
    elif c.startswith('rgba'):
        m = re.match(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)', c)
        if m: return (int(m.group(1)), int(m.group(2)), int(m.group(3)), float(m.group(4)))
    elif c.startswith('rgb'):
        m = re.match(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', c)
        if m: return (int(m.group(1)), int(m.group(2)), int(m.group(3)), 1.0)
    return None

def luminance(rgb):
    def channel(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.03928 else math.pow((v + 0.055) / 1.055, 2.4)
    return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])

def contrast(c1, c2):
    if not c1 or not c2: return 0.0
    if len(c1) == 4 and c1[3] < 1.0:
        a = c1[3]
        r = c1[0]*a + c2[0]*(1-a)
        g = c1[1]*a + c2[1]*(1-a)
        b = c1[2]*a + c2[2]*(1-a)
        rgb1 = (r, g, b)
    else:
        rgb1 = c1[:3]
    rgb2 = c2[:3]
    l1 = luminance(rgb1)
    l2 = luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

themes = ['construct', 'dynasty', 'notepad', 'samadhi', 'xeno', 'alchemist']
print('=== THEMES BATCH 3 STATIC AUDIT ===')

all_pass = True
for t in themes:
    css_path = f'styles/atmo/{t}.css'
    js_path = f'wings/atmo/{t}.js'
    
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()
    
    tokens = {}
    for m in re.finditer(r'(--[\w-]+)\s*:\s*([^;]+);', css):
        tokens[m.group(1)] = m.group(2).strip()
            
    missing = [tk for tk in REQUIRED_TOKENS if tk not in tokens]
    if missing: all_pass = False
    
    with open(js_path, 'r', encoding='utf-8') as f:
        js = f.read()
    js_size = os.path.getsize(js_path)
    
    has_crest = 'TitanAtmoCrest' in js or 'defineCrest' in js
    has_card = 'setCard' in js
    hardcoded = re.findall(r'(?:fill|stroke)\s*=\s*[\'"]#(?:[0-9a-fA-F]{3,8})[\'"]', js)
    if hardcoded or js_size >= 4096 or not has_crest or not has_card:
        all_pass = False
    
    ink_c = parse_color(tokens.get('--ink', ''))
    bg_c = parse_color(tokens.get('--bg', ''))
    surf_c = parse_color(tokens.get('--surface', ''))
    gold_c = parse_color(tokens.get('--gold', ''))
    ongold_c = parse_color(tokens.get('--on-gold', '#ffffff' if t == 'notepad' else '#000000'))
    muted_c = parse_color(tokens.get('--muted', ''))
    
    c_ink_bg = contrast(ink_c, bg_c) if ink_c and bg_c else 0.0
    c_muted_bg = contrast(muted_c, bg_c) if muted_c and bg_c else 0.0
    c_ongold_gold = contrast(ongold_c, gold_c) if ongold_c and gold_c else 0.0
    
    print(f'Theme [{t}]:')
    print(f'  CSS Tokens: {len(tokens)} found, {len(missing)} missing')
    if missing: print(f'    Missing: {missing}')
    print(f'  JS File: {js_size} bytes (under 4KB: {js_size < 4096}), Crest: {has_crest}, Card: {has_card}')
    print(f'  Hardcoded SVG Colors: {len(hardcoded)}')
    if hardcoded: print(f'    Found: {hardcoded}')
    print(f'  Contrast ratios: ink/bg = {c_ink_bg:.2f}:1, muted/bg = {c_muted_bg:.2f}:1, on-gold/gold = {c_ongold_gold:.2f}:1')
    print()

print('ALL BATCH 3 THEMES PASS CONTRACT:', all_pass)
