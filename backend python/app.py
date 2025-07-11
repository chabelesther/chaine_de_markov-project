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
 
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from main import clean_txt, construire_modele_markov_hybride, generate_story, autocomplete, MatriceTransition
# GrapheTransition n'est plus importé de main

# Définition de la nouvelle classe GrapheTransition fournie par l'utilisateur
class GrapheTransition:
    def __init__(self, data):
        self.data = data

    def trouver_valeur(self, source, cible):
        return self.data.get(source, {}).get(cible, 0.0)

    def construire_graphe_depuis_mots(self, mots_liste):
        G = nx.DiGraph()
        if not mots_liste or len(mots_liste) < 2:
            return G
        for i in range(len(mots_liste) - 1):
            source = mots_liste[i]
            cible = mots_liste[i+1]
            poids = self.trouver_valeur(source, cible)
            if poids > 0: # Ajouter l'arête seulement si la transition existe
                G.add_edge(source, cible, weight=poids)
        return G

    def construire_graphe_depuis_phrase(self, segments):
        G = nx.DiGraph()  # Création d'un graphe orienté
        if not segments: # S'assurer que segments n'est pas vide
            return G
        for i in range(len(segments) - 1):
            source = segments[i]  # Noeud source
            cible = segments[i + 1]  # Noeud cible
            poids = self.trouver_valeur(source, cible)  # Poids de l'arête
            G.add_edge(source, cible, weight=poids)  # Ajout de l'arête
        return G  # Retourne le graphe

# La méthode afficher_graphe du code utilisateur est intégrée dans generate_phrase
# car plt.show() n'est pas adapté pour la génération d'images en backend.
# Le code pour la génération d'image base64 est conservé.

# Forcer le dossier standard
# if os.getenv("APPDATA"):
#     # Windows
#     nltk_data_path = os.path.join(os.getenv("APPDATA"), "nltk_data")
#     nltk.data.path.append(nltk_data_path)
#     # Téléchargement dans le bon dossier
#     nltk.download("punkt", download_dir=nltk_data_path)
# else:
#     # Linux (Render)
#     nltk.download("punkt")
# Définir un répertoire persistant pour les données NLTK
nltk_data_dir = '/opt/render/project/src/nltk_data'
os.makedirs(nltk_data_dir, exist_ok=True)
nltk.data.path.append(nltk_data_dir)

# Télécharger punkt_tab si nécessaire
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab', download_dir=nltk_data_dir)

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
        grapheur = GrapheTransition(modele) # Utilise la nouvelle classe GrapheTransition
        
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
        
        # Générer le graphe avec le style demandé (arêtes courbées)
        G = grapheur.construire_graphe_depuis_phrase(var[1])
        
        plt.figure(figsize=(10, 7)) # Taille de la figure
        if G.number_of_nodes() == 0: # Graphe vide
             # Créer une image vide ou avec un message
            plt.text(0.5, 0.5, "Pas de données pour afficher le graphe", horizontalalignment='center', verticalalignment='center')
            plt.axis('off')
        else:
            pos = nx.spring_layout(G, seed=42, k=1.2)  # Disposition des noeuds
            edge_weights = [G[u][v]['weight'] for u, v in G.edges()]  # Poids des arêtes
            max_weight = max(edge_weights) if edge_weights else 1  # Normalisation
            # S'assurer que max_weight n'est pas zéro pour éviter la division par zéro
            if max_weight == 0:
                max_weight = 1
                
            norm_weights = [w / max_weight for w in edge_weights]  # Poids normalisés
            cmap = plt.cm.viridis  # Palette de couleurs
            edge_colors = [cmap(w) for w in norm_weights]  # Couleurs des arêtes

            nx.draw_networkx_nodes(G, pos, node_color='skyblue', node_size=1500)  # Dessin des noeuds
            nx.draw_networkx_edges(
                G,
                pos,
                edge_color=edge_colors,
                arrowstyle='-|>',
                arrowsize=25,
                width=2,
                connectionstyle='arc3,rad=0.1',  # Style d'arête courbée
                min_source_margin=30,
                min_target_margin=30
            )  # Dessin des arêtes
            edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in G.edges(data=True)}  # Étiquettes des arêtes
            nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=10)  # Affichage des étiquettes
            nx.draw_networkx_labels(G, pos, font_size=12, font_weight='bold')  # Étiquettes des noeuds
            plt.title("Graphe des transitions", fontsize=14)  # Titre
            plt.axis('off')  # Suppression des axes
        
        plt.tight_layout()  # Ajustement de la mise en page
        
        # Convertir le graphe en base64
        graph_buffer = io.BytesIO()
        plt.savefig(graph_buffer, format='png', bbox_inches='tight')
        plt.close() # Fermer la figure explicitement
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
    mots_str = request.form.get('mots', '')
    if not mots_str:
        return jsonify({'error': 'Aucun mot fourni'}), 400
    
    mots_liste = [mot.strip() for mot in mots_str.split(',') if mot.strip()]
    if not mots_liste or len(mots_liste) < 1: # Doit avoir au moins un mot pour la heatmap, deux pour le graphe
        return jsonify({'error': 'Liste de mots invalide ou insuffisante'}), 400

    matrice = MatriceTransition(modele)
    grapheur = GrapheTransition(modele)

    # Génération de la heatmap
    heatmap_json = matrice.get_heatmap_json(mots_liste)

    # Génération de l'image du graphe
    G = grapheur.construire_graphe_depuis_mots(mots_liste) # Utiliser une méthode adaptée pour une liste de mots
    
    graph_base64 = "" # Initialiser en cas de graphe vide
    plt.figure(figsize=(10, 7))
    if G.number_of_nodes() == 0 or G.number_of_edges() == 0:
        plt.text(0.5, 0.5, "Pas de données pour afficher le graphe\npour les mots fournis.", horizontalalignment='center', verticalalignment='center', wrap=True)
        plt.axis('off')
    else:
        pos = nx.spring_layout(G, seed=42, k=1.2)
        edge_weights = [G[u][v]['weight'] for u, v in G.edges()]
        max_w = max(edge_weights) if edge_weights else 1
        if max_w == 0: max_w = 1 # Eviter division par zéro
            
        norm_weights = [w / max_w for w in edge_weights]
        cmap = plt.cm.viridis
        edge_colors = [cmap(w) for w in norm_weights]

        nx.draw_networkx_nodes(G, pos, node_color='skyblue', node_size=1500)
        nx.draw_networkx_edges(
            G, pos, edge_color=edge_colors, arrowstyle='-|>',
            arrowsize=25, width=2, connectionstyle='arc3,rad=0.1',
            min_source_margin=30, min_target_margin=30
        )
        edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in G.edges(data=True)}
        nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=10)
        nx.draw_networkx_labels(G, pos, font_size=12, font_weight='bold')
        plt.title("Graphe des transitions pour les mots fournis", fontsize=14)
        plt.axis('off')
    
    plt.tight_layout()
    graph_buffer = io.BytesIO()
    plt.savefig(graph_buffer, format='png', bbox_inches='tight')
    plt.close()
    graph_buffer.seek(0)
    graph_base64 = base64.b64encode(graph_buffer.getvalue()).decode('utf-8')

    return jsonify({
        'heatmap': heatmap_json,
        'graph_image': f"data:image/png;base64,{graph_base64}"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)