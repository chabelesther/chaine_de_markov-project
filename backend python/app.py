# app.py
import nltk
from nltk.tokenize.punkt import PunktSentenceTokenizer
import io
import base64
import matplotlib
matplotlib.use('Agg')  # Configuration du backend non-interactif
import matplotlib.pyplot as plt
import seaborn as sns
import networkx as nx
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, send_file
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
origins = ["http://localhost:3000", "https://chaine-de-markov-gmm.vercel.app"]
CORS(app, resources={r"/*": {"origins": origins, "supports_credentials": True}})

# Remplacer le système de chargement par défaut
nltk.tokenize.sent_tokenize = PunktSentenceTokenizer().tokenize

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
    nombre_de_phrase = int(request.args.get('nombre_de_phrase', 1))
    
    phrases = []
    for i in range(nombre_de_phrase):
        var = generate_story(modele, limit=limit, start=start)
        matrice = MatriceTransition(modele)
        grapheur = GrapheTransition(modele)
        
        # Générer et sauvegarder les images
        plt.figure(figsize=(10, 8))
        sns.heatmap(matrice.df.loc[var[1], var[1]], annot=True, cmap="YlGnBu", fmt=".2f")
        plt.title("Carte de chaleur")
        plt.tight_layout()
        
        # Convertir la heatmap en base64
        heatmap_buffer = io.BytesIO()
        plt.savefig(heatmap_buffer, format='png', bbox_inches='tight')
        plt.close()
        heatmap_buffer.seek(0)
        heatmap_base64 = base64.b64encode(heatmap_buffer.getvalue()).decode('utf-8')
        
        # Générer le graphe
        G = grapheur.construire_graphe_depuis_phrase(var[1])
        plt.figure(figsize=(10, 7))
        pos = nx.spring_layout(G, seed=42, k=1.2)
        edge_weights = [G[u][v]['weight'] for u, v in G.edges()]
        max_weight = max(edge_weights) if edge_weights else 1
        norm_weights = [w / max_weight for w in edge_weights]
        cmap = plt.cm.viridis
        edge_colors = [cmap(w) for w in norm_weights]
        
        nx.draw_networkx_nodes(G, pos, node_color='skyblue', node_size=1500)
        nx.draw_networkx_edges(G, pos, edge_color=edge_colors, arrowstyle='-|>', arrowsize=25, width=2)
        edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in G.edges(data=True)}
        nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=10)
        nx.draw_networkx_labels(G, pos, font_size=12, font_weight='bold')
        plt.title("Graphe des transitions")
        plt.axis('off')
        plt.tight_layout()
        
        # Convertir le graphe en base64
        graph_buffer = io.BytesIO()
        plt.savefig(graph_buffer, format='png', bbox_inches='tight')
        plt.close()
        graph_buffer.seek(0)
        graph_base64 = base64.b64encode(graph_buffer.getvalue()).decode('utf-8')
        
        phrases.append({
            'phrase': var[0],
            'sequences': var[1],
            'heatmap_image': f"data:image/png;base64,{heatmap_base64}",
            'graph_image': f"data:image/png;base64,{graph_base64}"
        })
    
    return jsonify(phrases)

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