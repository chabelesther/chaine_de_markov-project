"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
// import Plotly from "react-plotly.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { motion, AnimatePresence } from "framer-motion";
import { Typewriter } from "@/components/typewriter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://chaine-de-markov-project.onrender.com";

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

  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(
    null
  );
  const [numberOfPhrases, setNumberOfPhrases] = useState<number>(1);

  const fetchAutocomplete = useCallback(async (partialInput: string) => {
    if (!partialInput.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.post<{ suggestions: string[] }>(
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

  const handleSuggestionClick = useCallback(
    (suggestion: string, index: number) => {
      setSelectedSuggestion(index);
      const selectedWord = suggestion.split(" (")[0].trim();
      const trimmedInput = input.trimEnd();
      const words = trimmedInput.split(/\s+/).filter(Boolean);
      const newInput =
        words.length === 0
          ? selectedWord
          : trimmedInput +
            (trimmedInput.endsWith(" ") ? "" : " ") +
            selectedWord;

      // Mettre à jour l'input et les suggestions en une seule fois
      setInput(`${newInput} `);
      const newWords = newInput.split(/\s+/).filter(Boolean);
      const partialInput = newWords.slice(-2).join(" ");

      // Utiliser requestAnimationFrame pour éviter les re-rendus multiples
      requestAnimationFrame(() => {
        setSelectedSuggestion(null);
        fetchAutocomplete(partialInput);
      });
    },
    [input, fetchAutocomplete]
  );

  // Utiliser useMemo pour mémoriser la liste des suggestions
  const memoizedSuggestions = useMemo(() => suggestions, [suggestions]);

  // Optimiser l'effet de debounce
  useEffect(() => {
    const words = input.trim().split(/\s+/);
    const partialInput = words.slice(-2).join(" ");

    const timeoutId = setTimeout(() => {
      if (!input.trim()) {
        setSuggestions([]);
        setError(null);
        return;
      }
      fetchAutocomplete(partialInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [input, fetchAutocomplete]);

  // Optimiser le composant SuggestionsList avec useMemo
  const SuggestionsList = useMemo(
    () => (
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

        {isLoading && !memoizedSuggestions.length && (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
            <span className="ml-2 text-yellow-300">Chargement...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {memoizedSuggestions.length > 0 && (
            <motion.div
              className="rounded-md border border-yellow-500/30 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {memoizedSuggestions.map((suggestion, index) => (
                <motion.div
                  key={`${suggestion}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion, index)}
                  className={`cursor-pointer border-b border-yellow-500/20 p-3 last:border-b-0 hover:bg-yellow-500/20 transition-all ${
                    selectedSuggestion === index ? "bg-yellow-600/40" : ""
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {suggestion}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && !error && !memoizedSuggestions.length && (
          <p className="text-slate-400 mt-2 text-sm">
            Aucune suggestion disponible.
          </p>
        )}
      </div>
    ),
    [
      error,
      isLoading,
      memoizedSuggestions,
      selectedSuggestion,
      handleSuggestionClick,
    ]
  );

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

        <Tabs defaultValue="generation" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="generation">Génération de phrases</TabsTrigger>
            <TabsTrigger value="autocomplete">Auto-complétion</TabsTrigger>
          </TabsList>

          <TabsContent value="generation">
            <motion.div
              className="backdrop-blur-md bg-white/10 p-6 rounded-xl shadow-xl mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <label
                htmlFor="input-text"
                className="block text-lg font-medium mb-2 text-yellow-300"
              >
                Phrase de départ :
              </label>
              <div className="relative">
                <Input
                  id="input-text"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.toLowerCase())}
                  placeholder="Entrez une phrase de départ..."
                  className="w-full bg-slate-800/70 border-yellow-500/40 text-white placeholder:text-slate-400 focus-visible:ring-yellow-500 mb-4"
                />
                {SuggestionsList}
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
                  className="max-w-6xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <Accordion type="multiple" className="w-full mx-4">
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
                            <span className="text-white truncate ">
                              <Typewriter
                                className="text-white truncate w-48"
                                text={phrase.phrase}
                              />
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

                            <div className="grid grid-cols-1 gap-6">
                              <div className="bg-white/5 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                                  Carte de chaleur
                                </h3>
                                <div className="flex justify-center">
                                  <img
                                    src={phrase.heatmap_image}
                                    alt="Carte de chaleur"
                                    className="max-w-full h-auto rounded-lg shadow-lg"
                                  />
                                </div>
                              </div>

                              <div className="bg-white/5 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                                  Graphe de transition
                                </h3>
                                <div className="flex justify-center">
                                  <img
                                    src={phrase.graph_image}
                                    alt="Graphe de transition"
                                    className="max-w-full h-auto rounded-lg shadow-lg"
                                  />
                                </div>
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
          </TabsContent>

          <TabsContent value="autocomplete">
            <motion.div
              className="backdrop-blur-md bg-white/10 p-6 rounded-xl shadow-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <label
                htmlFor="autocomplete-input"
                className="block text-lg font-medium mb-2 text-yellow-300"
              >
                Entrez votre texte :
              </label>
              <div className="relative">
                <Input
                  id="autocomplete-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.toLowerCase())}
                  placeholder="Tapez ici... ex: 'ce' "
                  className="w-full bg-slate-800/70 border-yellow-500/40 text-white placeholder:text-slate-400 focus-visible:ring-yellow-500"
                />
                {SuggestionsList}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default React.memo(Autocomplete);
