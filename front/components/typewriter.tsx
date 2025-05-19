"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number;
}

export const Typewriter = ({ text, speed = 40 }: TypewriterProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Réinitialiser l'état quand le texte change
    setDisplayedText("");
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  useEffect(() => {
    if (currentIndex >= text.length) {
      setIsComplete(true);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayedText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed]);

  return (
    <div className="leading-relaxed">
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="ml-1 inline-block w-1.5 h-4 bg-yellow-400"
        ></motion.span>
      )}
    </div>
  );
};
