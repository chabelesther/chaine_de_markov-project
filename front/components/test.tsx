/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
// import { AutocompleteResponse } from "../types";
import Plotly from "react-plotly.js";
import { Button } from "@/components/ui/button";
interface AutocompleteResponse {
  suggestions: string[];
}
const Autocomplete: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [plotData, setPlotData] = useState<any>(null);
  const fetchHeatmap = async () => {
    const words = input.split(" ").filter(Boolean);
    const response = await axios.post(
      "http://localhost:5000/heatmap",
      new URLSearchParams({ mots: words.join(",") }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    setPlotData(JSON.parse(response.data));
  };
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!input.trim()) {
        setSuggestions(["Commencez à taper pour voir les suggestions."]);
        return;
      }
      try {
        setIsLoading(true);
        // Envoyer les deux derniers mots saisis
        const words = input.trim().split(/\s+/);
        const partialInput = words.slice(-2).join(" ");
        const response = await axios.post<AutocompleteResponse>(
          "http://localhost:5000/autocomplete",
          new URLSearchParams({ input: partialInput }),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );
        setSuggestions(response.data.suggestions);
        console.log("response.data.suggestions", response.data.suggestions);
      } catch (error) {
        console.error("Erreur lors de la récupération des suggestions:", error);
        setSuggestions(["Erreur lors de la récupération des suggestions."]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Délai de 300ms

    return () => clearTimeout(timeout);
  }, [input]);

  return (
    <div className="mx-auto max-w-2xl p-5">
      <h1 className="mb-5 text-2xl font-bold">Auto-complétion avec Markov</h1>
      <label htmlFor="input-text" className="mb-2 block text-lg">
        Entrez votre texte :
      </label>
      <input
        id="input-text"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Tapez ici..."
        className="mb-4 w-full rounded-md border p-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ maxWidth: "500px" }}
      />
      <div>
        {isLoading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : (
          <div className="rounded-md border" style={{ maxWidth: "500px" }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="border-b p-2.5 last:border-b-0 hover:bg-gray-100"
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      <Button onClick={fetchHeatmap} className="mt-2">
        Afficher Heatmap
      </Button>
      {plotData && (
        <Plotly
          data={plotData.data}
          layout={{ ...plotData.layout, title: "Carte de chaleur filtrée" }}
          style={{ width: "100%", maxWidth: "600px" }}
        />
      )}
    </div>
  );
};

export default Autocomplete;
