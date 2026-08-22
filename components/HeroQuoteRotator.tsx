import React, { useState, useEffect } from "react";

const HERO_QUOTES = [
  {
    quote: "Your rights shouldn't be hidden behind paperwork.",
    subtext: "Clear, source-grounded legal and administrative roadmaps for every Indian citizen.",
  },
  {
    quote: "Understand your rights. Know what to do next.",
    subtext: "Step-by-step guidance backed by official statutory acts and designated grievance portals.",
  },
  {
    quote: "Complex bureaucracy. Simple answers. Clear action.",
    subtext: "Navigate tenancy, consumer, RTI, labour disputes, and welfare schemes without legal jargon.",
  },
  {
    quote: "Justice begins with knowing your rights.",
    subtext: "Democratizing access to Indian laws, citizen charters, and public dispute redressal.",
  },
  {
    quote: "Government processes shouldn't require a legal dictionary.",
    subtext: "Get actionable advice in plain language, formatted and cited from verified sources.",
  },
  {
    quote: "Your language. Your rights. Your next step.",
    subtext: "Multilingual assistance across Hindi, English, Hinglish, Bengali, Tamil, Telugu, and more.",
  },
];

interface HeroQuoteRotatorProps {
  className?: string;
}

export const HeroQuoteRotator: React.FC<HeroQuoteRotatorProps> = ({ className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % HERO_QUOTES.length);
        setIsFading(false);
      }, 300);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const handleSelectQuote = (index: number) => {
    if (index === currentIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsFading(false);
    }, 200);
  };

  const currentItem = HERO_QUOTES[currentIndex];

  return (
    <div
      id="hero-quote-rotator"
      className={`relative w-full text-center py-5 px-4 sm:px-6 rounded-2xl bg-gradient-to-b from-surface-container-low/80 to-surface-container-lowest border border-outline-variant/60 shadow-xs mb-4 select-none ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[11px] font-bold text-primary tracking-wider uppercase">
          Empowering Indian Citizens
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      </div>

      <div className="min-h-[58px] flex flex-col justify-center items-center">
        <blockquote
          className={`font-serif text-base sm:text-lg md:text-xl font-bold text-on-surface tracking-tight leading-snug transition-opacity duration-300 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          "{currentItem.quote}"
        </blockquote>
        <p
          className={`text-xs text-on-surface-variant mt-1 max-w-xl mx-auto line-clamp-1 transition-opacity duration-300 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          {currentItem.subtext}
        </p>
      </div>

      {/* Subtle indicator dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {HERO_QUOTES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectQuote(idx)}
            aria-label={`Go to quote ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex
                ? "w-6 bg-primary"
                : "w-1.5 bg-outline-variant hover:bg-on-surface-variant/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
