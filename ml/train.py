import numpy as np
import pickle
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import os

def generate_data():
    np.random.seed(42)
    
    # Features: [js_ts_ratio, python_ratio, backend_ratio, repo_count, total_stars, account_age]
    
    # 100 Frontend: js_ts_ratio 0.55-0.95, others low
    frontend_js_ts = np.random.uniform(0.55, 0.95, 100)
    frontend_python = np.random.uniform(0.0, 0.1, 100)
    frontend_backend = np.random.uniform(0.0, 0.1, 100)
    frontend_repo = np.random.uniform(0.0, 0.3, 100)
    frontend_stars = np.random.uniform(0.0, 0.2, 100)
    frontend_age = np.random.uniform(0.1, 0.5, 100)
    frontend = np.column_stack((frontend_js_ts, frontend_python, frontend_backend, frontend_repo, frontend_stars, frontend_age))

    # 100 Data Science: python_ratio 0.45-0.90, others low
    ds_js_ts = np.random.uniform(0.0, 0.2, 100)
    ds_python = np.random.uniform(0.45, 0.90, 100)
    ds_backend = np.random.uniform(0.0, 0.2, 100)
    ds_repo = np.random.uniform(0.0, 0.5, 100)
    ds_stars = np.random.uniform(0.0, 0.5, 100)
    ds_age = np.random.uniform(0.1, 0.8, 100)
    ds = np.column_stack((ds_js_ts, ds_python, ds_backend, ds_repo, ds_stars, ds_age))

    # 100 Backend: backend_ratio 0.45-0.85, others low
    backend_js_ts = np.random.uniform(0.0, 0.2, 100)
    backend_python = np.random.uniform(0.0, 0.2, 100)
    backend_backend = np.random.uniform(0.45, 0.85, 100)
    backend_repo = np.random.uniform(0.1, 0.6, 100)
    backend_stars = np.random.uniform(0.0, 0.4, 100)
    backend_age = np.random.uniform(0.2, 0.8, 100)
    backend = np.column_stack((backend_js_ts, backend_python, backend_backend, backend_repo, backend_stars, backend_age))

    # 100 DevOps: repo_count high, languages mixed, backend_ratio 0.2-0.4
    devops_js_ts = np.random.uniform(0.1, 0.3, 100)
    devops_python = np.random.uniform(0.1, 0.3, 100)
    devops_backend = np.random.uniform(0.2, 0.4, 100)
    devops_repo = np.random.uniform(0.6, 1.0, 100)  # repo_count high
    devops_stars = np.random.uniform(0.1, 0.5, 100)
    devops_age = np.random.uniform(0.4, 1.0, 100)
    devops = np.column_stack((devops_js_ts, devops_python, devops_backend, devops_repo, devops_stars, devops_age))

    # 100 Full-Stack: none dominant, js_ts_ratio 0.25-0.50, backend_ratio 0.20-0.40
    fs_js_ts = np.random.uniform(0.25, 0.50, 100)
    fs_python = np.random.uniform(0.05, 0.20, 100)
    fs_backend = np.random.uniform(0.20, 0.40, 100)
    fs_repo = np.random.uniform(0.2, 0.7, 100)
    fs_stars = np.random.uniform(0.1, 0.6, 100)
    fs_age = np.random.uniform(0.2, 0.9, 100)
    fs = np.column_stack((fs_js_ts, fs_python, fs_backend, fs_repo, fs_stars, fs_age))

    # Combine all
    X = np.vstack((frontend, ds, backend, devops, fs))
    return X

def main():
    print("Generating data...")
    X = generate_data()

    print("Scaling data...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print("Training KMeans model...")
    kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
    kmeans.fit(X_scaled)

    # Ensure ml directory exists
    os.makedirs('ml', exist_ok=True)

    print("Saving model and scaler to /ml...")
    with open('ml/kmeans_model.pkl', 'wb') as f:
        pickle.dump(kmeans, f)
    with open('ml/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)

    print("Model and scaler saved successfully.")

    print("\n--- Validation with 5 Test Examples ---")
    
    # Columns: js_ts_ratio, python_ratio, backend_ratio, repo_count, total_stars, account_age
    test_examples = np.array([
        [0.85, 0.05, 0.05, 0.2, 0.1, 0.3],  # Expected: Frontend
        [0.1, 0.8, 0.1, 0.3, 0.2, 0.4],     # Expected: Data Science
        [0.1, 0.1, 0.7, 0.4, 0.3, 0.5],     # Expected: Backend
        [0.2, 0.2, 0.3, 0.9, 0.4, 0.8],     # Expected: DevOps
        [0.35, 0.1, 0.3, 0.5, 0.4, 0.6]     # Expected: Full-Stack
    ])
    
    test_scaled = scaler.transform(test_examples)
    predictions = kmeans.predict(test_scaled)
    
    # Map predictions to possible categories (for human readability in test)
    # We will do this formally in app.py based on cluster centers
    for i, pred in enumerate(predictions):
        print(f"Test Example {i+1} assigned to Cluster {pred}")

if __name__ == "__main__":
    main()
