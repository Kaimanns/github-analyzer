"""
test_model.py
-------------
Gerçek GitHub profillerini çekip eğitilmiş Random Forest modeliyle test eder.
Kategori bazlı doğruluk ve genel özet rapor üretir.
"""

import sys
import pickle
import json
import numpy as np
from pathlib import Path

# Windows terminal UTF-8 fix
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────
# Import from collect_real_data
# ─────────────────────────────────────────────
from collect_real_data import build_profile, GITHUB_TOKEN, HEADERS  # noqa: F401

ML_DIR = Path(__file__).parent

# ─────────────────────────────────────────────
# Test profilleri ve beklenen kategoriler
# ─────────────────────────────────────────────

TEST_PROFILES = {
    "Frontend": [
        "paulirish", "LeaVerou",
        "markdalgleish", "zachleat"
    ],
    "Backend": [
        "fatih", "bradfitz",
        "tsenart", "paultag"
    ],
    "Data Science": [
        "hadley", "wesm",
        "mwaskom", "amueller"
    ],
    "DevOps": [
        "ahmetb", "errm",
        "imjasonh", "vdemeester"
    ],
    "Full-Stack": [
        "sindresorhus", "feross"
    ]
}

# ─────────────────────────────────────────────
# normalize_features — train.py ile aynı 10 özellik
# ─────────────────────────────────────────────

def normalize_features(row: dict) -> list[float]:
    js_ts_ratio        = float(row.get("js_ts_ratio", 0))
    python_ratio       = float(row.get("python_ratio", 0))
    backend_ratio      = float(row.get("backend_ratio", 0))
    devops_ratio       = float(row.get("devops_ratio", 0)) * 3.0
    repo_count         = float(row.get("repo_count", 0)) / 100.0
    total_stars        = float(row.get("total_stars", 0)) / 1000.0
    account_age        = float(row.get("account_age_days", 0)) / 3650.0
    fork_ratio         = float(row.get("fork_ratio", 0))
    language_diversity = float(row.get("language_diversity", 0)) * 1.5
    max_lang_ratio     = float(row.get("max_lang_ratio", 0))
    return [
        js_ts_ratio, python_ratio, backend_ratio, devops_ratio,
        repo_count, total_stars, account_age, fork_ratio,
        language_diversity, max_lang_ratio,
    ]

# ─────────────────────────────────────────────
# Model yükle
# ─────────────────────────────────────────────

def load_models():
    rf_path     = ML_DIR / "rf_model.pkl"
    scaler_path = ML_DIR / "scaler.pkl"

    if not rf_path.exists():
        print("[HATA] rf_model.pkl bulunamadi!")
        sys.exit(1)
    if not scaler_path.exists():
        print("[HATA] scaler.pkl bulunamadi!")
        sys.exit(1)

    with open(rf_path, "rb") as f:
        rf = pickle.load(f)
    with open(scaler_path, "rb") as f:
        scaler = pickle.load(f)

    print(f"[OK] rf_model.pkl ve scaler.pkl yuklendi.")
    return rf, scaler

# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    if not GITHUB_TOKEN:
        print("[UYARI] GITHUB_TOKEN bulunamadi -- rate limit 60 req/h!")
    else:
        print(f"[OK] Token: {GITHUB_TOKEN[:10]}...")

    # Eğitim verisini oku ve eğitimdeki kullanıcıları bul
    real_data_path = ML_DIR / "real_data.json"
    train_users = set()
    if real_data_path.exists():
        data = json.loads(real_data_path.read_text(encoding="utf-8"))
        train_users = {row.get("username", "").lower() for row in data}

    # Test profillerini filtrele
    filtered_test_profiles = {}
    print("\n[BILGI] Egitim verisindeki profiller test disi birakiliyor...")
    for cat, users in TEST_PROFILES.items():
        valid_users = []
        for u in users:
            if u.lower() in train_users:
                print(f"[UYARI] {u} egitim verisinde var, test disi birakildi")
            else:
                valid_users.append(u)
        filtered_test_profiles[cat] = valid_users

    rf, scaler = load_models()

    # Sonuç: {expected_cat: [(username, predicted, confidence, ok), ...]}
    results: dict[str, list[tuple]] = {}

    for expected_cat, usernames in filtered_test_profiles.items():
        print(f"\n{'='*52}")
        print(f"  {expected_cat.upper()}")
        print(f"{'='*52}")

        cat_results = []

        for username in usernames:
            try:
                profile = build_profile(username)
                if profile is None:
                    print(f"  {username:<20} [SKIP]")
                    cat_results.append((username, None, 0.0, False))
                    continue

                feat_vec  = normalize_features(profile)
                X         = scaler.transform(np.array([feat_vec], dtype=float))
                predicted = rf.predict(X)[0]
                proba     = rf.predict_proba(X)[0]
                classes   = list(rf.classes_)
                
                # Frontend ve Backend olasılıklarını ayır
                idx_frontend = classes.index("Frontend")
                idx_backend = classes.index("Backend")
                prob_fe = proba[idx_frontend]
                prob_be = proba[idx_backend]

                # Özellik vektöründeki language_diversity_score değerini al (index numarasına dikkat et, genelde 8'dir)
                language_diversity_score = feat_vec[8] 

                # HİBRİT KURAL 1: Model Frontend dese bile, dil çeşitliliği çok yüksekse (>= 1.2) Full-Stack'tir
                if predicted == "Frontend" and language_diversity_score >= 1.2:
                    predicted = "Full-Stack"
                    confidence = 88.5 # Heuristic kural için yapay güven skoru

                # HİBRİT KURAL 2: Frontend ve Backend olasılıkları birbirine çok yakınsa (fark < 0.20 ve toplam > 0.40) Full-Stack'tir
                elif abs(prob_fe - prob_be) < 0.20 and (prob_fe + prob_be > 0.40):
                    predicted = "Full-Stack"
                    confidence = ((prob_fe + prob_be) / 2) * 100.0
                else:
                    confidence = proba[classes.index(predicted)] * 100.0

                ok = (predicted == expected_cat)
                cat_results.append((username, predicted, confidence, ok))

            except Exception as e:
                print(f"  {username:<20} [SKIP] ({e})")
                cat_results.append((username, None, 0.0, False))

        results[expected_cat] = cat_results

    # ─── Detaylı Sonuçlar ─────────────────────────────────
    print(f"\n{'='*60}")
    print("  DETAYLI SONUCLAR")
    print(f"{'='*60}\n")

    for expected_cat, cat_results in results.items():
        print(f"  === {expected_cat.upper()} ===")
        for username, predicted, confidence, ok in cat_results:
            if predicted is None:
                print(f"  {username:<22} [SKIP]")
                continue
            check = "✓" if ok else "✗"
            print(
                f"  {username:<22} → Tahmin: {predicted:<14} {check}  "
                f"(%{confidence:.1f} guven)"
            )
        print()

    # ─── Özet ─────────────────────────────────────────────
    print(f"{'='*60}")
    print("  OZET")
    print(f"{'='*60}\n")

    total_ok    = 0
    total_count = 0

    for expected_cat, cat_results in results.items():
        # Sadece tahmin yapılabilen (SKIP olmayan) profiller sayılır
        valid = [(u, p, c, ok) for (u, p, c, ok) in cat_results if p is not None]
        ok_count  = sum(1 for *_, ok in valid if ok)
        n         = len(valid)
        pct       = (ok_count / n * 100) if n > 0 else 0.0
        total_ok    += ok_count
        total_count += n
        print(f"  {expected_cat:<14}: {ok_count}/{n}  %{pct:.1f}")

    genel_pct = (total_ok / total_count * 100) if total_count > 0 else 0.0
    print(f"\n  {'Genel':<14}: {total_ok}/{total_count}  %{genel_pct:.1f}")
    print()


if __name__ == "__main__":
    main()
