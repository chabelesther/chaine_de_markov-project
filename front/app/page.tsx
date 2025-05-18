// src/components/Autocomplete.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
// import Plotly from "react-plotly.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AutocompleteResponse,
  GeneratePhraseResponse,
  VisualizationsResponse,
  PlotData,
} from "../types";
import dynamic from "next/dynamic";

// Importer Plot sans SSR
const Plotly = dynamic(() => import("react-plotly.js"), {
  ssr: false, // Désactiver le SSR
});
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const Autocomplete: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedPhrase, setGeneratedPhrase] = useState<string>("");
  const [visualizations, setVisualizations] = useState<{
    heatmap: PlotData | null;
    surface_3d: PlotData | null;
    bars_3d: PlotData | null;
    graph: PlotData | null;
  }>({
    heatmap: null,
    surface_3d: null,
    bars_3d: null,
    graph: null,
  });
  const [selectedPlotType, setSelectedPlotType] = useState<string | null>(null); // Null means show all
  const [error, setError] = useState<string | null>(null);

  const fetchAutocomplete = useCallback(async (partialInput: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.post<AutocompleteResponse>(
        `${API_URL}/autocomplete`,
        new URLSearchParams({ input: partialInput }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error("Erreur lors de la récupération des suggestions:", error);
      setSuggestions([]);
      setError("Erreur lors de la récupération des suggestions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    const selectedWord = suggestion.split(" (")[0].trim();
    const trimmedInput = input.trimEnd(); // Remove trailing spaces only
    const words = trimmedInput.split(/\s+/).filter(Boolean);

    let newInput: string;
    if (words.length === 0) {
      // Empty input: start with the selected word
      newInput = selectedWord;
    } else {
      // Append the selected word to existing input
      newInput =
        trimmedInput + (trimmedInput.endsWith(" ") ? "" : " ") + selectedWord;
    }

    // Set input with a trailing space for continued typing
    setInput(`${newInput} `);
    // Immediately fetch new suggestions based on the last two words
    const newWords = newInput.split(/\s+/).filter(Boolean);
    const partialInput = newWords.slice(-2).join(" ");
    fetchAutocomplete(partialInput);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!input.trim()) {
        setSuggestions([]);
        setError(null);
        return;
      }
      const words = input.trim().split(/\s+/);
      const partialInput = words.slice(-2).join(" ");
      fetchAutocomplete(partialInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [input, fetchAutocomplete]);

  const generatePhrase = async () => {
    setIsGenerating(true);
    try {
      setError(null);
      const response = await axios.get<GeneratePhraseResponse>(
        `${API_URL}/generate_phrase`,
        { params: { start: input.trim() || "les bases", limit: 10 } }
      );
      setGeneratedPhrase(response.data.phrase);
      setVisualizations({
        heatmap: response.data.heatmap,
        // surface_3d: response.data.surface_3d,
        // bars_3d: response.data.bars_3d,
        graph: response.data.graph,
      });
      //refetch visualizations
      if (response.data.heatmap) {
        fetchVisualizations();
      }
    } catch (error) {
      console.error("Erreur lors de la génération de la phrase:", error);
      setGeneratedPhrase("Erreur lors de la génération.");
      setVisualizations({
        heatmap: null,
        surface_3d: null,
        bars_3d: null,
        graph: null,
      });
      setError("Erreur lors de la génération de la phrase.");
    }
    setIsGenerating(false);
  };

  const fetchVisualizations = async () => {
    setIsGenerating(true);
    try {
      setError(null);
      const words = input.split(" ").filter(Boolean);
      const response = await axios.post<VisualizationsResponse>(
        `${API_URL}/visualizations`,
        new URLSearchParams({ mots: words.join(",") }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      setVisualizations({
        heatmap: response.data.heatmap,
        // surface_3d: response.data.surface_3d,
        // bars_3d: response.data.bars_3d,
        graph: response.data.graph,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des visualisations:",
        error
      );
      setVisualizations({
        heatmap: null,
        surface_3d: null,
        bars_3d: null,
        graph: null,
      });
      setError("Erreur lors de la récupération des visualisations.");
    }
    setIsGenerating(false);
  };

  const visualizationTypes = [
    { key: "heatmap", label: "Heatmap" },
    // { key: "surface_3d", label: "Surface 3D" },
    // { key: "bars_3d", label: "Barres 3D" },
    { key: "graph", label: "Graphe de transition" },
  ];

  return (
    <div className="mx-auto max-w-4xl p-4 mb-32">
      <h1 className="mb-5 text-2xl font-bold">Auto-complétion avec Markov</h1>
      <div className="mb-4">
        <label htmlFor="input-text" className="mb-2 block text-lg">
          Entrez votre texte :
        </label>
        <Input
          id="input-text"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tapez ici..."
          className="w-full max-w-[500px]"
        />
      </div>
      <div className="mb-4 min-h-32">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {isLoading && !suggestions.length && (
          <p className="text-gray-500">Chargement...</p>
        )}
        {suggestions.length > 0 ? (
          <div className="mb-4 rounded-md border max-w-[500px]">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                //animation quand la suggestion apparait (re rendu)
                className="cursor-pointer border-b p-2.5 last:border-b-0 hover:bg-gray-100 transition-opacity duration-300"
                style={{
                  animation: "fadeIn 0.3s ease-in-out",
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Aucune suggestion disponible.</p>
        )}
      </div>
      <div className=" fixed bottom-0 left-0 right-0 z-50 bg-white p-2 border-t flex flex-wrap gap-4 items-center justify-evenly">
        <Button onClick={generatePhrase} disabled={isGenerating}>
          {isGenerating ? "Génération en cours..." : "Générer une phrase"}
        </Button>
        <Button onClick={fetchVisualizations} disabled={isGenerating}>
          {isGenerating
            ? "Récupération en cours..."
            : "Actualiser Visualisations"}
        </Button>
        <Select
          value={selectedPlotType || "all"}
          onValueChange={(value) =>
            setSelectedPlotType(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type de visualisation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {visualizationTypes.map((type) => (
              <SelectItem key={type.key} value={type.key}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {generatedPhrase && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Phrase générée :</h2>
          <p>{generatedPhrase}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visualizationTypes
          .filter((type) => !selectedPlotType || selectedPlotType === type.key)
          .map((type) => (
            <div key={type.key} className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">{type.label}</h3>
              {visualizations[type.key as keyof typeof visualizations] ? (
                <Plotly
                  data={
                    visualizations[type.key as keyof typeof visualizations]!
                      .data
                  }
                  layout={{
                    ...visualizations[type.key as keyof typeof visualizations]!
                      .layout,
                    width: 400,
                    height: 300,
                  }}
                  style={{ width: "100%", maxWidth: "400px" }}
                />
              ) : (
                <p className="text-gray-500">
                  Aucune visualisation disponible.
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Autocomplete;
