from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import json
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

ML_DIR = Path(__file__).parent

model_path   = ML_DIR / "rf_model.pkl"
scaler_path  = ML_DIR / "scaler.pkl"

classifier_rf      = None
classifier_scaler  = None

def load_models():
    global classifier_rf, classifier_scaler

    if model_path.exists() and scaler_path.exists():
        with open(model_path, "rb") as f:
            classifier_rf = pickle.load(f)
        with open(scaler_path, "rb") as f:
            classifier_scaler = pickle.load(f)
    else:
        print("[UYARI] Model dosyaları bulunamadı. Önce train.py çalıştırın.")


load_models()


@app.route("/classify", methods=["POST"])
def classify():
    if classifier_rf is None or classifier_scaler is None:
        load_models()
        if classifier_rf is None:
            return jsonify({"error": "Model not trained yet."}), 500

    data = request.json
    if not data:
        return jsonify({"error": "No input provided."}), 400

    try:
        # ── 6 eski özellik ──────────────────────────────────────
        js_ts_ratio          = float(data.get("js_ts_ratio", 0))
        python_ratio         = float(data.get("python_ratio", 0))
        backend_ratio        = float(data.get("backend_ratio", 0))
        repo_count_raw       = float(data.get("repo_count", 0))
        total_stars_raw      = float(data.get("total_stars", 0))
        account_age_days_raw = float(data.get("account_age_days", 0))

        # ── 3 yeni özellik ──────────────────────────────────────
        devops_r_raw  = float(data.get("devops_ratio", 0))
        devops_ratio  = devops_r_raw * 3.0
        avg_repo_size = float(data.get("avg_repo_size", 0))
        fork_ratio    = float(data.get("fork_ratio", 0))

        # max_lang_ratio: client'tan gelebilir
        max_lang_ratio = float(data.get("max_lang_ratio", 0))

        # language_count_norm: languageStats'tan hesapla
        lang_stats           = data.get("languageStats", [])
        language_count_norm  = min(len(lang_stats), 10) / 10.0

        # language_diversity: client'tan gelir (collect_real_data'daki normalize haliyle)
        language_diversity   = float(data.get("language_diversity", 0)) * 1.5

        # Normalizasyon (train.py normalize_features() ile tutarlı)
        repo_count  = repo_count_raw    / 100.0
        total_stars = total_stars_raw   / 1000.0
        account_age = account_age_days_raw / 3650.0

        features = np.array([[
            js_ts_ratio, python_ratio, backend_ratio, devops_ratio,
            repo_count, total_stars, account_age, fork_ratio,
            language_diversity, max_lang_ratio,
        ]])
        features_scaled = classifier_scaler.transform(features)

        predicted  = classifier_rf.predict(features_scaled)[0]
        proba      = classifier_rf.predict_proba(features_scaled)[0]
        classes    = list(classifier_rf.classes_)
        
        idx_frontend = classes.index("Frontend")
        idx_backend  = classes.index("Backend")
        prob_fe = proba[idx_frontend]
        prob_be = proba[idx_backend]

        language_diversity_score = features[0][8]

        if predicted == "Frontend" and language_diversity_score >= 1.2:
            predicted = "Full-Stack"
            confidence = 0.885
        elif abs(prob_fe - prob_be) < 0.20 and (prob_fe + prob_be > 0.40):
            predicted = "Full-Stack"
            confidence = float((prob_fe + prob_be) / 2)
        else:
            confidence = float(proba[classes.index(predicted)])

        return jsonify({
            "category":   predicted,
            "confidence": round(confidence, 4),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":          "ok",
        "model_loaded":    classifier_rf is not None,
        "model_type":      "RandomForestClassifier",
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)