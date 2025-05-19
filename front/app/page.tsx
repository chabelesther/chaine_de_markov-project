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
  VisualizationsResponse,
  PlotData,
} from "../types";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Data, Layout, Config } from "plotly.js";
import { Typewriter } from "@/components/typewriter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

const Plotly = dynamic(() => import("react-plotly.js"), {
  ssr: false,
});
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
// const API_URL =
//   process.env.NEXT_PUBLIC_API_URL ||
//   "https://chaine-de-markov-project.onrender.com";

interface GeneratedPhrase {
  phrase: string;
  sequences: string[];
  heatmap_image: string;
  graph_image: string;
}

const Autocomplete: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedPhrases, setGeneratedPhrases] = useState<GeneratedPhrase[]>(
    []
  );
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
  const [selectedPlotType, setSelectedPlotType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(
    null
  );
  const [numberOfPhrases, setNumberOfPhrases] = useState<number>(1);

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

  const handleSuggestionClick = (suggestion: string, index: number) => {
    setSelectedSuggestion(index);

    setTimeout(() => {
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
      // Reset selected suggestion
      setSelectedSuggestion(null);
      // Immediately fetch new suggestions based on the last two words
      const newWords = newInput.split(/\s+/).filter(Boolean);
      const partialInput = newWords.slice(-2).join(" ");
      fetchAutocomplete(partialInput);
    }, 300);
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

  const generatePhrases = async () => {
    setIsGenerating(true);
    try {
      setError(null);
      const response = await axios.get<GeneratedPhrase[]>(
        `${API_URL}/generate_phrase`,
        {
          params: {
            start: input.trim() || "les bases",
            limit: 20,
            nombre_de_phrase: numberOfPhrases,
          },
        }
      );
      setGeneratedPhrases(response.data);
    } catch (error) {
      console.error("Erreur lors de la génération des phrases:", error);
      setError("Erreur lors de la génération des phrases.");
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
        heatmap: response.data.heatmap || null,
        surface_3d: null,
        bars_3d: null,
        graph: response.data.graph || null,
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
    { key: "graph", label: "Graphe de transition" },
  ];

  const handleSliderChange = (value: number[]) => {
    setNumberOfPhrases(value[0]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.h1
          className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-600"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Auto-complétion avec Markov
        </motion.h1>

        <motion.div
          className="max-w-xl mx-auto mb-8 backdrop-blur-md bg-white/10 p-6 rounded-xl shadow-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <label
            htmlFor="input-text"
            className="block text-lg font-medium mb-2 text-yellow-300"
          >
            Entrez votre texte :
          </label>
          <Input
            id="input-text"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            placeholder="Tapez ici... ex: 'ce' "
            className="w-full bg-slate-800/70 border-yellow-500/40 text-white placeholder:text-slate-400 focus-visible:ring-yellow-500"
          />

          <div className="min-h-28 mt-4">
            {error && (
              <motion.p
                className="text-red-400 mb-4 px-3 py-2 bg-red-900/20 rounded-md"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {error}
              </motion.p>
            )}

            {isLoading && !suggestions.length && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
                <span className="ml-2 text-yellow-300">Chargement...</span>
              </div>
            )}

            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  className="rounded-md border border-yellow-500/30 overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion, index)}
                      className={`cursor-pointer border-b border-yellow-500/20 p-3 last:border-b-0 hover:bg-yellow-500/20 transition-all ${
                        selectedSuggestion === index ? "bg-yellow-600/40" : ""
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {suggestion}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!isLoading && !error && !suggestions.length && (
              <p className="text-slate-400 mt-2 text-sm">
                Aucune suggestion disponible.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-lg font-medium mb-2 text-yellow-300">
              Nombre de phrases à générer : {numberOfPhrases}
            </label>
            <Slider
              value={[numberOfPhrases]}
              onValueChange={handleSliderChange}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <Button
            onClick={generatePhrases}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg shadow-yellow-700/30"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                Génération...
              </>
            ) : (
              "Générer des phrases"
            )}
          </Button>
        </motion.div>

        <AnimatePresence>
          {generatedPhrases.length > 0 && (
            <motion.div
              className="max-w-4xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Accordion type="single" collapsible className="w-full">
                {generatedPhrases.map((phrase, index) => (
                  <AccordionItem
                    key={index}
                    value={`phrase-${index}`}
                    className="border border-yellow-500/20 rounded-lg mb-4 overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 bg-white/5 hover:bg-white/10">
                      <div className="flex items-center">
                        <span className="text-yellow-300 mr-2">
                          Phrase {index + 1}:
                        </span>
                        <span className="text-white truncate">
                          {phrase.phrase}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-3 bg-white/5">
                      <div className="space-y-6">
                        <div className="bg-white/5 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                            Phrase complète
                          </h3>
                          <Typewriter text={phrase.phrase} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white/5 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                              Carte de chaleur
                            </h3>
                            <img
                              src={phrase.heatmap_image}
                              alt="Carte de chaleur"
                              className="w-full h-auto rounded-lg"
                            />
                          </div>

                          <div className="bg-white/5 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                              Graphe de transition
                            </h3>
                            <img
                              src={phrase.graph_image}
                              alt="Graphe de transition"
                              className="w-full h-auto rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
          {visualizationTypes
            .filter(
              (type) => !selectedPlotType || selectedPlotType === type.key
            )
            .map((type) => (
              <motion.div
                key={type.key}
                className="backdrop-blur-md bg-white/5 rounded-xl p-4 border border-yellow-500/20 shadow-lg overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-center text-yellow-300">
                  {type.label}
                </h3>
                {visualizations[type.key as keyof typeof visualizations] ? (
                  <div className="flex justify-center">
                    <Plotly
                      data={
                        (
                          visualizations[
                            type.key as keyof typeof visualizations
                          ] as PlotData
                        ).data as Data[]
                      }
                      layout={{
                        ...((
                          visualizations[
                            type.key as keyof typeof visualizations
                          ] as PlotData
                        ).layout as Partial<Layout>),
                        width: undefined,
                        height: 350,
                        paper_bgcolor: "rgba(0,0,0,0)",
                        plot_bgcolor: "rgba(0,0,0,0)",
                        font: { color: "#e0e0e0" },
                        margin: { t: 30, b: 40, l: 50, r: 30 },
                      }}
                      style={{ width: "100%" }}
                      config={{ responsive: true } as Config}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <p>Aucune visualisation disponible</p>
                  </div>
                )}
              </motion.div>
            ))}
        </div>

        <motion.div
          className="z-50 bg-slate-900/80 backdrop-blur-md p-4 border-t border-yellow-500/30 shadow-lg"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
        >
          <div className="container mx-auto flex flex-wrap items-center justify-evenly gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={fetchVisualizations}
                disabled={isGenerating}
                className="bg-yellow-700 hover:bg-yellow-800 text-white shadow-md"
              >
                {isGenerating ? "Récupération..." : "Actualiser"}
              </Button>
            </motion.div>

            <Select
              value={selectedPlotType || "all"}
              onValueChange={(value) =>
                setSelectedPlotType(value === "all" ? null : value)
              }
            >
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white focus:ring-yellow-500">
                <SelectValue placeholder="Type de visualisation" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="all">Toutes</SelectItem>
                {visualizationTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Autocomplete;
