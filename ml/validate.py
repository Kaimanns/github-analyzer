"""
validate.py -- Random Forest model doğruluk raporu
"""
import sys, pickle, json
import numpy as np
from pathlib import Path
from collections import Counter

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

ML = Path(__file__).parent

with open(ML / 'rf_model.pkl', 'rb') as f:
    rf = pickle.load(f)
with open(ML / 'scaler.pkl', 'rb') as f:
    sc = pickle.load(f)

data = json.loads((ML / 'real_data.json').read_text(encoding='utf-8'))

print(f"Model sınıfları: {rf.classes_.tolist()}")
print()

results = []
for row in data:
    feats = [
        row['js_ts_ratio'],
        row['python_ratio'],
        row['backend_ratio'],
        row.get('devops_ratio', 0) * 3.0,
        row['repo_count'] / 100.0,
        row['total_stars'] / 1000.0,
        row['account_age_days'] / 3650.0,
        row.get('fork_ratio', 0),
        row.get('language_diversity', 0),
        row.get('max_lang_ratio', 0),
    ]
    scaled = sc.transform([feats])
    pred   = rf.predict(scaled)[0]
    true_c = row['category']
    results.append((row['username'], true_c, pred, pred == true_c))

print(f"{'Kullanici':<20} {'Gercek':<16} {'Tahmin':<16} {'Eslesti'}")
print('-' * 65)
for u, t, p, ok in results:
    print(f"{u:<20} {t:<16} {p:<16} {'OK' if ok else 'XX'}")

correct = sum(1 for *_, ok in results if ok)
total   = len(results)
print()
print(f"Genel Accuracy: {correct}/{total} = {correct/total:.1%}")
print()

cats = ["Frontend", "Backend", "Data Science", "DevOps", "Full-Stack"]
print("Kategori bazlı doğruluk:")
print(f"  {'Kategori':<16} {'Dogru/Toplam':<14} {'%'}")
print(f"  {'-'*42}")
for cat in cats:
    cat_rows = [(t, p, ok) for _, t, p, ok in results if t == cat]
    if not cat_rows:
        continue
    c   = sum(1 for *_, ok in cat_rows if ok)
    pct = c / len(cat_rows) * 100
    bar = '#' * int(pct / 5)
    print(f"  {cat:<16} {c}/{len(cat_rows):<13} {pct:5.1f}% {bar} [{'OK' if pct >= 70 else 'XX'}]")

wrong = [(u, t, p) for u, t, p, ok in results if not ok]
print()
if wrong:
    print("Yanlış tahmin edilenler:")
    print(f"  {'Kullanici':<20} {'Gercek':<16} {'Tahmin'}")
    print(f"  {'-'*52}")
    for u, t, p in wrong:
        print(f"  {u:<20} {t:<16} {p}")
else:
    print("Tüm profiller doğru tahmin edildi!")

overall_acc = correct / total * 100
fs_rows     = [(t,p,ok) for _,t,p,ok in results if t=='Full-Stack']
fs_acc      = sum(1 for *_,ok in fs_rows if ok)/len(fs_rows)*100 if fs_rows else 0
devops_rows = [(t,p,ok) for _,t,p,ok in results if t=='DevOps']
devops_acc  = sum(1 for *_,ok in devops_rows if ok)/len(devops_rows)*100 if devops_rows else 0

print()
print(f"Hedef: Full-Stack > %70 --> {'BASARILI [OK]' if fs_acc >= 70 else 'BASARISIZ [XX]'} ({fs_acc:.1f}%)")
print(f"Hedef: DevOps     > %70 --> {'BASARILI [OK]' if devops_acc >= 70 else 'BASARISIZ [XX]'} ({devops_acc:.1f}%)")
print(f"Hedef: Genel      > %80 --> {'BASARILI [OK]' if overall_acc >= 80 else 'BASARISIZ [XX]'} ({overall_acc:.1f}%)")
