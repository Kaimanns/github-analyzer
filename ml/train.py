"""
train.py
--------
Random Forest Classifier ile model eğitimi.
"""
import numpy as np
import pickle
import json
import sys
from collections import Counter
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, StratifiedKFold

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

ML_DIR = Path(__file__).parent
CATEGORIES = ["Frontend", "Data Science", "Backend", "DevOps", "Full-Stack"]


def normalize_features(row: dict) -> list[float]:
    js_ts_ratio      = float(row.get("js_ts_ratio", 0))
    python_ratio     = float(row.get("python_ratio", 0))
    backend_ratio    = float(row.get("backend_ratio", 0))
    devops_ratio     = float(row.get("devops_ratio", 0)) * 3.0
    repo_count       = float(row.get("repo_count", 0)) / 100.0
    total_stars      = float(row.get("total_stars", 0)) / 1000.0
    account_age      = float(row.get("account_age_days", 0)) / 3650.0
    fork_ratio       = float(row.get("fork_ratio", 0))
    language_diversity = float(row.get("language_diversity", 0)) * 1.5
    max_lang_ratio   = float(row.get("max_lang_ratio", 0))
    return [
        js_ts_ratio, python_ratio, backend_ratio, devops_ratio,
        repo_count, total_stars, account_age, fork_ratio,
        language_diversity, max_lang_ratio,
    ]


def main():
    real_data_path = ML_DIR / "real_data.json"
    if not real_data_path.exists():
        print("[HATA] real_data.json bulunamadı!")
        return

    raw = json.loads(real_data_path.read_text(encoding="utf-8"))

    X_list, y = [], []
    for row in raw:
        X_list.append(normalize_features(row))
        y.append(row["category"])

    X = np.array(X_list, dtype=float)
    print(f"[OK] Veri yüklendi: {len(X)} profil")

    dist = Counter(y)
    print("Kategori dağılımı:")
    for cat in CATEGORIES:
        print(f"  {cat:16s}: {dist.get(cat, 0)}")

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Cross-validation ile en iyi n_estimators bul
    print("\nCross-validation (Stratified 5-fold)...")
    best_n, best_score = 100, 0.0
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    for n in [50, 100, 200, 300]:
        rf = RandomForestClassifier(
            n_estimators=n,
            max_depth=None,
            min_samples_leaf=1,
            random_state=42,
            class_weight="balanced",
        )
        scores = cross_val_score(rf, X_scaled, y, cv=cv, scoring="accuracy")
        print(f"  n_estimators={n}: {scores.mean():.1%} (±{scores.std():.1%})")
        if scores.mean() > best_score:
            best_score, best_n = scores.mean(), n

    print(f"\nSeçilen n_estimators={best_n} (CV: {best_score:.1%})")

    # Final modeli tüm veriyle eğit
    rf = RandomForestClassifier(
        n_estimators=best_n,
        max_depth=None,
        min_samples_leaf=1,
        random_state=42,
        class_weight="balanced",
    )
    rf.fit(X_scaled, y)

    # Feature importance
    feature_names = [
        "js_ts_ratio", "python_ratio", "backend_ratio", "devops_ratio",
        "repo_count", "total_stars", "account_age", "fork_ratio",
        "language_diversity", "max_lang_ratio",
    ]
    print("\nFeature Importance:")
    for name, imp in sorted(
        zip(feature_names, rf.feature_importances_),
        key=lambda x: -x[1]
    ):
        bar = "#" * int(imp * 100)
        print(f"  {name:<22}: {imp:.3f} {bar}")

    # Eğitim seti accuracy
    train_preds = rf.predict(X_scaled)
    correct = sum(p == t for p, t in zip(train_preds, y))
    print(f"\nEğitim seti accuracy: {correct}/{len(y)} = {correct/len(y):.1%}")

    # Detaylı tablo
    print(f"\n{'Kullanici':<20} {'Gercek':<16} {'Tahmin':<16} {'Eslesti'}")
    print("-" * 62)
    for i, (pred, true_cat) in enumerate(zip(train_preds, y)):
        sym      = "OK" if pred == true_cat else "XX"
        username = raw[i]["username"]
        print(f"{username:<20} {true_cat:<16} {pred:<16} {sym}")

    # Kaydet
    with open(ML_DIR / "rf_model.pkl", "wb") as f:
        pickle.dump(rf, f)
    with open(ML_DIR / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    print("\n[OK] rf_model.pkl ve scaler.pkl kaydedildi.")


if __name__ == "__main__":
    main()
