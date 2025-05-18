/* eslint-disable @typescript-eslint/no-explicit-any */

// Définition pour les données de Plotly (peut être affinée si nécessaire)
export interface PlotDataItem {
  x?: any[];
  y?: any[];
  z?: any; // Pour les graphiques 3D, heatmap z peut être une matrice 2D
  type?: string;
  mode?: string;
  name?: string;
  text?: string[] | string;
  texttemplate?: string;
  hovertemplate?: string;
  hoverinfo?: string;
  line?: { color?: string; width?: number };
  marker?: { color?: string | string[]; size?: number; showscale?: boolean };
  coloraxis?: string;
  [key: string]: any; // Pour d'autres propriétés spécifiques à Plotly
}

export interface PlotData {
  data: PlotDataItem[];
  layout: any; // Partial<Plotly.Layout> ou un type plus spécifique
}

// Réponse pour l'auto-complétion
export interface AutocompleteResponse {
  suggestions: string[];
}

// Réponse pour la génération de phrase
export interface GeneratePhraseResponse {
  phrase: string;
  sequences: string[];
  // Permet d'indexer avec une chaîne pour les types de graphiques
  // et inclut les types de graphiques connus pour une meilleure autocomplétion si possible.
  [plotName: string]: PlotData | string | string[] | undefined;
  heatmap?: PlotData;
  surface_3d?: PlotData;
  bars_3d?: PlotData;
  graph?: PlotData;
}

// Réponse pour les visualisations
export interface VisualizationsResponse {
  // Permet d'indexer avec une chaîne pour les types de graphiques
  [plotName: string]: PlotData | undefined;
  heatmap?: PlotData;
  surface_3d?: PlotData;
  bars_3d?: PlotData;
  graph?: PlotData;
}

// Type pour les différents types de graphiques supportés
export type PlotType = "heatmap" | "surface_3d" | "bars_3d" | "graph";
