from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app)

model_path = os.path.join(os.path.dirname(__file__), 'kmeans_model.pkl')
scaler_path = os.path.join(os.path.dirname(__file__), 'scaler.pkl')

classifier_kmeans = None
classifier_scaler = None
cluster_mapping = {}

def load_models():
    global classifier_kmeans, classifier_scaler, cluster_mapping
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        with open(model_path, 'rb') as f:
            classifier_kmeans = pickle.load(f)
        with open(scaler_path, 'rb') as f:
            classifier_scaler = pickle.load(f)
            
        # Determine cluster mapping automatically
        centers = classifier_kmeans.cluster_centers_
        
        # Original scaled features order: 
        # 0: js_ts_ratio, 1: python_ratio, 2: backend_ratio, 3: repo_count, 4: total_stars, 5: account_age
        frontend_cluster = int(np.argmax(centers[:, 0]))
        ds_cluster = int(np.argmax(centers[:, 1]))
        backend_cluster = int(np.argmax(centers[:, 2]))
        devops_cluster = int(np.argmax(centers[:, 3]))
        
        assigned = {frontend_cluster, ds_cluster, backend_cluster, devops_cluster}
        all_clusters = set(range(classifier_kmeans.n_clusters))
        unassigned = list(all_clusters - assigned)
        
        # If there's an overlap in maxes, unassigned might have more than 1. We just pick the first unassigned for Full-Stack.
        fs_cluster = unassigned[0] if unassigned else -1 # Fallback
        
        cluster_mapping = {
            frontend_cluster: "Frontend",
            ds_cluster: "Data Science",
            backend_cluster: "Backend",
            devops_cluster: "DevOps",
        }
        if fs_cluster != -1:
            cluster_mapping[fs_cluster] = "Full-Stack"
            
        # Fill any other unassigned to Full-Stack just in case
        for c in range(classifier_kmeans.n_clusters):
            if c not in cluster_mapping:
                cluster_mapping[c] = "Full-Stack"
                
load_models()

@app.route('/classify', methods=['POST'])
def classify():
    if classifier_kmeans is None or classifier_scaler is None:
        load_models()
        if classifier_kmeans is None:
            return jsonify({"error": "Model not trained yet."}), 500

    data = request.json
    if not data:
        return jsonify({"error": "No input provided."}), 400

    try:
        # Expected keys
        js_ts_ratio = float(data.get('js_ts_ratio', 0))
        python_ratio = float(data.get('python_ratio', 0))
        backend_ratio = float(data.get('backend_ratio', 0))
        repo_count_raw = float(data.get('repo_count', 0))
        total_stars_raw = float(data.get('total_stars', 0))
        account_age_days_raw = float(data.get('account_age_days', 0))

        # Normalize specific fields
        repo_count = repo_count_raw / 100.0
        total_stars = total_stars_raw / 1000.0
        account_age = account_age_days_raw / 3650.0

        features = np.array([[js_ts_ratio, python_ratio, backend_ratio, repo_count, total_stars, account_age]])
        
        # Scale
        features_scaled = classifier_scaler.transform(features)
        
        # Predict
        cluster_id = int(classifier_kmeans.predict(features_scaled)[0])
        category = cluster_mapping.get(cluster_id, "Unknown")
        
        # Distance and confidence
        distances = classifier_kmeans.transform(features_scaled)[0]
        min_dist = distances[cluster_id]
        max_dist = np.max(distances)
        
        # Normalize distance to 0-1 confidence
        # closer to center = higher confidence, so 1 - (min_dist / max_dist)
        if max_dist > 0:
            confidence = float(1.0 - (min_dist / max_dist))
        else:
            confidence = 1.0
            
        # Bound confidence
        confidence = max(0.0, min(1.0, confidence))

        return jsonify({
            "category": category,
            "confidence": round(confidence, 4),
            "cluster_id": cluster_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
