# app.py
import nltk
from nltk.tokenize.punkt import PunktSentenceTokenizer

# Remplacer le système de chargement par défaut
nltk.tokenize.sent_tokenize = PunktSentenceTokenizer().tokenize

nltk.download('punkt')

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from main import clean_txt, construire_modele_markov_hybride, generate_story, autocomplete, MatriceTransition, GrapheTransition
# Forcer le dossier standard
if os.getenv("APPDATA"):
    # Windows
    nltk_data_path = os.path.join(os.getenv("APPDATA"), "nltk_data")
    nltk.data.path.append(nltk_data_path)
    # Téléchargement dans le bon dossier
    nltk.download("punkt", download_dir=nltk_data_path)
else:
    # Linux (Render)
    nltk.download("punkt")

# Verify Texte2.txt exists
if not os.path.exists("Texte2.txt"):
    raise FileNotFoundError("Le fichier Texte2.txt est requis.")

# Read and clean the input file
with open("Texte2.txt", "r", encoding="utf-8") as f:
    liste_de_phrases = [ligne.strip() for ligne in f if ligne.strip()]

liste_netoye = [clean_txt([elt]) for elt in liste_de_phrases]
modele = construire_modele_markov_hybride(liste_netoye, max_n_gram=2)

# Initialize Flask
app = Flask(__name__)
origins = ["http://localhost:3000", "https://chaine-de-markov-gmm.vercel.app/"]
CORS(app, resources={r"/*": {"origins": origins, "supports_credentials": True}})

@app.route('/')
def index():
    return "Backend Flask pour l'auto-complétion avec Markov"

@app.route('/autocomplete', methods=['POST'])
def autocomplete_route():
    partial_input = request.form.get('input', '').strip()
    print(f"Reçu: {partial_input}")
    if not partial_input:
        return jsonify({'suggestions': []})
    suggestions = autocomplete(modele, partial_input, max_words=10, return_new_words_only=True)
    return jsonify({'suggestions': suggestions})

@app.route('/generate_phrase', methods=['GET'])
def generate_phrase():
    start = request.args.get('start', 'les bases')
    limit = int(request.args.get('limit', 10))
    var = generate_story(modele, limit=limit, start=start)
    matrice = MatriceTransition(modele)
    grapheur = GrapheTransition(modele)
    return jsonify({
        'phrase': var[0],
        'sequences': var[1],
        'heatmap': matrice.get_heatmap_json(var[1]),
        'graph': grapheur.get_graph_json(var[1]),
        # 'surface_3d': matrice.get_3d_surface_json(),
        # 'bars_3d': matrice.get_3d_bars_json()
    })

@app.route('/visualizations', methods=['POST'])
def visualizations():
    mots = request.form.get('mots', '').split(',')
    matrice = MatriceTransition(modele)
    grapheur = GrapheTransition(modele)
    return jsonify({
        'heatmap': matrice.get_heatmap_json(mots),
        # 'surface_3d': matrice.get_3d_surface_json(),
        # 'bars_3d': matrice.get_3d_bars_json(),
        'graph': grapheur.get_graph_json(mots)
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)