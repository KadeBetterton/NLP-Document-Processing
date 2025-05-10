import re
import string
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction import text as sklearn_text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.manifold import MDS
from sklearn.metrics import silhouette_score

app = Flask(__name__)
CORS(app)

stop_words = set(sklearn_text.ENGLISH_STOP_WORDS)

def clean_text(s):
    tokens = s.lower().translate(str.maketrans('', '', string.punctuation)).split()
    filtered = [t for t in tokens if t not in stop_words]
    return " ".join(filtered)

@app.route("/cluster", methods=["POST"])
def cluster_docs():
    data = request.get_json()
    docs = data["documents"]
    contents = [doc["content"] for doc in docs]

    cleaned_texts = [clean_text(text) for text in contents]
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(cleaned_texts)

    best_k = 2
    best_score = -1
    max_k = min(len(docs) // 10, 20)  # dynamically allow more clusters
    for k in range(2, max_k + 1):
        km_test = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)
        score = silhouette_score(X, km_test.labels_)
        print(f"k={k}, silhouette={score:.4f}")
        if score > best_score:
            best_k = k
            best_score = score

    model = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    labels = model.fit_predict(X)

    terms = vectorizer.get_feature_names_out()
    top_terms_per_cluster = {}

    for i in range(best_k):
        cluster_indices = np.where(labels == i)[0]
        cluster_matrix = X[cluster_indices]
        mean_tfidf = cluster_matrix.mean(axis=0).A1
        top_indices = mean_tfidf.argsort()[-5:][::-1]
        top_terms = [terms[j] for j in top_indices]
        top_terms_per_cluster[i] = top_terms

    coords = MDS(n_components=2, dissimilarity='euclidean', random_state=42, n_init=4).fit_transform(X.toarray())

    for i, doc in enumerate(docs):
        doc["cluster"] = int(labels[i])
        doc["top_terms"] = top_terms_per_cluster[labels[i]]
        doc["mds_x"] = float(coords[i, 0])
        doc["mds_y"] = float(coords[i, 1])

    return jsonify(docs)

if __name__ == "__main__":
    app.run(debug=True)

