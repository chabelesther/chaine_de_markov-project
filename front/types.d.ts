/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/index.ts
export interface AutocompleteResponse {
  suggestions: string[];
}

export interface GeneratePhraseResponse {
  phrase: string;
  sequences: string[];
  heatmap: any;
  graph: any;
}

export interface VisualizationsResponse {
  heatmap: any;
  surface_3d: any;
  bars_3d: any;
  graph: any;
}
