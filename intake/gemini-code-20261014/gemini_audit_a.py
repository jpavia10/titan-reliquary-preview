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
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
        elif len(h) == 8:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16)/255.0)
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

canonical = [
    'glacier', 'solaris', 'valhalla', 'zen', 'odyssey',
    'afterhours', 'colossus', 'conservator', 'nocturne', 'silkroad',
    'construct', 'dynasty', 'notepad', 'samadhi', 'xeno', 'alchemist',
    'abyss', 'neon', 'kaleido', 'cursedwing'
]
nextgen = ['arcade', 'pulp', 'drafting', 'diorama', 'bauhaus', 'terminal']
all_themes = canonical + nextgen

print(f'=== TOTAL THEMES TO AUDIT: {len(all_themes)} ===')
passed_count = 0

for t in all_themes:
    css_path = f'styles/atmo/{t}.css'
    js_path = f'wings/atmo/{t}.js'
    
    if not os.path.exists(css_path) or not os.path.exists(js_path):
        print(f'FAIL: Missing files for {t}')
        continue
        
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()
    tokens = dict(re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', css))
    missing = [tk for tk in REQUIRED_TOKENS if tk not in tokens]
    
    with open(js_path, 'r', encoding='utf-8') as f:
        js = f.read()
    js_size = os.path.getsize(js_path)
    
    has_crest = 'TitanAtmoCrest' in js or 'defineCrest' in js
    has_card = 'setCard' in js
    hardcoded = re.findall(r'(?:fill|stroke)\s*=\s*[\'"]#(?:[0-9a-fA-F]{3,8})[\'"]', js)
    has_swatch = f'.sw-{t}' in css
    
    ink_c = parse_color(tokens.get('--ink', ''))
    bg_c = parse_color(tokens.get('--bg', ''))
    c_ink_bg = contrast(ink_c, bg_c) if (ink_c and bg_c) else 0.0
    
    ok = (len(missing) == 0 and js_size < 4096 and len(hardcoded) == 0 and has_crest and has_card and has_swatch and c_ink_bg >= 7.0)
    if ok:
        passed_count += 1
        print(f'PASS [{t}]: tokens={len(tokens)} (0 miss), size={js_size}B, hardcoded={len(hardcoded)}, swatch={has_swatch}, contrast={c_ink_bg:.2f}:1')
    else:
        print(f'FAIL [{t}]: tokens={len(tokens)} (miss: {missing}), size={js_size}B, hardcoded={hardcoded}, swatch={has_swatch}, contrast={c_ink_bg:.2f}:1')

print(f'\nTOTAL RESULT: {passed_count}/{len(all_themes)} PASS!')
