import json
from pathlib import Path
d = json.loads(Path('ml/real_data.json').read_text(encoding='utf-8'))
fs = [p for p in d if p['category'] == 'Full-Stack']
for p in fs:
    print(f"{p['username']:<20} stars={p['total_stars']:<8} js={p['js_ts_ratio']:.3f} backend={p['backend_ratio']:.3f} devops={p.get('devops_ratio',0):.3f}")
