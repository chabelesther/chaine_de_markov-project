# main.py
import re
from nltk.tokenize import word_tokenize
import random
import networkx as nx
import pandas as pd
import numpy as np
import nltk
import os
import plotly.express as px
import plotly.graph_objects as go



# Forcer le dossier standard
if os.getenv("APPDATA"):
    # Windows
    nltk_data_path = os.path.join(os.getenv("APPDATA"), "nltk_data")
    nltk.data.path.append(nltk_data_path)
    nltk.download("punkt", download_dir=nltk_data_path)
else:
    # Linux (Render)
    nltk.download("punkt")

# Read the input file
with open("Texte2.txt", "r", encoding="utf-8") as f:
    liste_de_phrases = [ligne.strip() for ligne in f if ligne.strip()]

def clean_txt(txt):
    cleaned_txt = []
    for line in txt:
        line = line.lower()
        line = re.sub(r"[,.\"\'!@#$%^&*(){}?/;`~:<>+=-\\]", "", line)
        tokens = word_tokenize(line)
        words = [word for word in tokens if word.isalpha()]
        cleaned_txt += words
    return cleaned_txt

liste_netoye = [clean_txt([elt]) for elt in liste_de_phrases]

def construire_modele_markov_hybride(liste_de_listes, max_n_gram):
    transitions = {}
    for n in range(1, max_n_gram + 1):
        for liste_mots in liste_de_listes:
            if len(liste_mots) < n + 1:
                continue
            for i in range(len(liste_mots) - 2 * n + 1):
                etat_courant = " ".join(liste_mots[i:i+n])
                etat_suivant = " ".join(liste_mots[i+n:i+2*n])
                if etat_courant not in transitions:
                    transitions[etat_courant] = {}
                if etat_suivant not in transitions[etat_courant]:
                    transitions[etat_courant][etat_suivant] = 0
                transitions[etat_courant][etat_suivant] += 1
            for i in range(len(liste_mots) - n):
                etat_courant = " ".join(liste_mots[i:i+n])
                etat_suivant = liste_mots[i+n]
                if etat_courant not in transitions:
                    transitions[etat_courant] = {}
                if etat_suivant not in transitions[etat_courant]:
                    transitions[etat_courant][etat_suivant] = 0
                transitions[etat_courant][etat_suivant] += 1
    modele_hybride = {}
    for etat_courant, suivants in transitions.items():
        total = sum(suivants.values())
        modele_hybride[etat_courant] = {
            etat_suivant: round(compte / total, 4)
            for etat_suivant, compte in suivants.items()
        }
    return modele_hybride

def generate_story(markov_model, limit=10, start='my story'):
    n = 0
    curr_state = start
    story = curr_state + " "
    sequences_mot = [curr_state]
    while n < limit:
        if curr_state not in markov_model:
            break
        next_state = random.choices(
            list(markov_model[curr_state].keys()),
            list(markov_model[curr_state].values())
        )[0]
        curr_state = next_state
        story += curr_state + " "
        sequences_mot.append(curr_state)
        n += len(next_state.split())
        if n >= limit:
            story = " ".join(story.split()[:limit])
            sequences_mot = sequences_mot[:limit]
            break
    return [story.strip(), sequences_mot]

def autocomplete(markov_model, partial_input, max_words=5, return_new_words_only=False):
    curr_state = partial_input.strip()
    suggestions = []
    if curr_state not in markov_model:
        return []
    next_states = markov_model[curr_state]
    for next_state, prob in next_states.items():
        continuation = next_state if return_new_words_only else f"{curr_state} {next_state}"
        if len(continuation.split()) <= max_words:
            suggestions.append((continuation, prob))
    suggestions.sort(key=lambda x: x[1], reverse=True)
    return [f"{cont} (probabilité: {prob:.4f})" for cont, prob in suggestions[:3]]

class MatriceTransition:
    def __init__(self, data):
        self.data = data
        self.df = self._construire_matrice()

    def _construire_matrice(self):
        row_labels = set()
        col_labels = set()
        for row, cols in self.data.items():
            row_labels.add(row)
            for col in cols.keys():
                col_labels.add(col)
        all_labels = sorted(row_labels.union(col_labels))  # Fusion et tri des étiquettes
        df = pd.DataFrame(0.0, index=all_labels, columns=all_labels)
        for row, cols in self.data.items():
            for col, val in cols.items():
                df.loc[row, col] = val
        return df  # Retourne la matrice

    def get_heatmap_json(self, mots):
        mots_valides = [mot for mot in mots if mot in self.df.index and mot in self.df.columns]
        if not mots_valides:
            return None
        df_filtrée = self.df.loc[mots_valides, mots_valides]
        fig = px.imshow(
            df_filtrée,
            labels=dict(x="Colonnes (cibles)", y="Lignes (sources)", color="Probabilité"),
            x=mots_valides,
            y=mots_valides,
            text_auto=".2f",
            color_continuous_scale="YlGnBu",
            title="Carte de chaleur filtrée"
        )
        return fig.to_dict()

    def get_3d_surface_json(self):
        etats = sorted(set(self.data.keys()) | {k for d in self.data.values() for k in d})
        n = len(etats)
        etat_to_idx = {etat: i for i, etat in enumerate(etats)}
        matrice = np.zeros((n, n))
        for src, transitions in self.data.items():
            for dst, poids in transitions.items():
                i, j = etat_to_idx[src], etat_to_idx[dst]
                matrice[i, j] = poids
        fig = go.Figure(data=[
            go.Surface(
                x=np.arange(n),
                y=np.arange(n),
                z=matrice,
                colorscale="Viridis",
                showscale=True
            )
        ])
        fig.update_layout(
            title="Matrice de transition (Surface 3D)",
            scene=dict(
                xaxis_title="Source",
                yaxis_title="Cible",
                zaxis_title="Poids",
                xaxis=dict(ticktext=etats, tickvals=list(range(n))),
                yaxis=dict(ticktext=etats, tickvals=list(range(n)))
            )
        )
        return fig.to_dict()

    def get_3d_bars_json(self):
        etats = sorted(set(self.data.keys()) | {k for d in self.data.values() for k in d})
        n = len(etats)
        etat_to_idx = {etat: i for i, etat in enumerate(etats)}
        x, y, z = [], [], []
        for src, transitions in self.data.items():
            for dst, poids in transitions.items():
                x.append(etat_to_idx[src])
                y.append(etat_to_idx[dst])
                z.append(poids)
        fig = go.Figure(data=[
            go.Scatter3d(
                x=x,
                y=y,
                z=z,
                mode='markers',
                marker=dict(size=5, color=z, colorscale='Viridis', showscale=True),
                text=[f"{etats[int(xi)]} -> {etats[int(yi)]}: {zi:.2f}" for xi, yi, zi in zip(x, y, z)]
            )
        ])
        fig.update_layout(
            title="Matrice de transition (Barres 3D)",
            scene=dict(
                xaxis_title="Source",
                yaxis_title="Cible",
                zaxis_title="Poids",
                xaxis=dict(ticktext=etats, tickvals=list(range(n))),
                yaxis=dict(ticktext=etats, tickvals=list(range(n)))
            )
        )
        return fig.to_dict()





class GrapheTransition:
    def __init__(self, data):
        self.data = data

    def trouver_valeur(self, source, cible):
        return self.data.get(source, {}).get(cible, 0.0)

    def construire_graphe_depuis_phrase(self, segments):
        G = nx.DiGraph()
        for i in range(len(segments) - 1):
            source = segments[i]
            cible = segments[i + 1]
            poids = self.trouver_valeur(source, cible)
            if poids > 0:  # Only add edges with non-zero weights
                G.add_edge(source, cible, weight=poids)
        return G

    def get_graph_json(self, segments):
        G = self.construire_graphe_depuis_phrase(segments)
        if not G.nodes:
            return {
                "data": [],
                "layout": {
                    "title": {"text": "Graphe des transitions (vide)"},
                    "showlegend": False,
                    "xaxis": {"showgrid": False, "zeroline": False},
                    "yaxis": {"showgrid": False, "zeroline": False}
                }
            }
        pos = nx.spring_layout(G, seed=42, k=1.2)
        edge_x, edge_y = [], []
        for edge in G.edges():
            x0, y0 = pos[edge[0]]
            x1, y1 = pos[edge[1]]
            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])
        node_x, node_y = [], []
        for node in G.nodes():
            x, y = pos[node]
            node_x.append(x)
            node_y.append(y)
        edge_trace = go.Scatter(
            x=edge_x, y=edge_y,
            line=dict(width=2, color='#888'),
            hoverinfo='none',
            mode='lines'
        )
        node_trace = go.Scatter(
            x=node_x, y=node_y,
            mode='markers+text',
            text=list(G.nodes()),
            textposition="top center",
            marker=dict(showscale=False, color='skyblue', size=10)
        )
        edge_labels = []
        for u, v, d in G.edges(data=True):
            x0, y0 = pos[u]
            x1, y1 = pos[v]
            edge_labels.append({
                'x': (x0 + x1) / 2,
                'y': (y0 + y1) / 2,
                'text': f"{d['weight']:.2f}",
                'showarrow': False
            })
        fig = go.Figure(data=[edge_trace, node_trace],
                        layout=go.Layout(
                            title="Graphe des transitions",
                            showlegend=False,
                            hovermode='closest',
                            margin=dict(b=20, l=5, r=5, t=40),
                            annotations=edge_labels,
                            xaxis=dict(showgrid=False, zeroline=False),
                            yaxis=dict(showgrid=False, zeroline=False)
                        ))
        return fig.to_dict()