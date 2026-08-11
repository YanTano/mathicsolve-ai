import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  Copy,
  Check,
  RotateCcw,
  Keyboard,
  Sparkles,
  Share2,
  BookmarkCheck,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import { MathSolution } from "../types";
import { MathGraphD3 } from "./MathGraphD3";

interface ResultViewProps {
  solution: MathSolution;
  onBackToCamera: () => void;
  onOpenManualInput: () => void;
  onSaveToHistory?: (solution: MathSolution) => void;
  isSaved?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({
  solution,
  onBackToCamera,
  onOpenManualInput,
  onSaveToHistory,
  isSaved = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [explanationMode, setExplanationMode] = useState<"simple" | "detailed">("simple");

  const handleCopyAnswer = () => {
    if (solution.finalAnswer) {
      navigator.clipboard.writeText(solution.finalAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyFullSolution = () => {
    const stepsText = solution.steps && solution.steps.length > 0
      ? solution.steps.map((s, idx) => `${s.stepNumber || `0${idx + 1}`}. ${s.title}: ${s.expression}${s.explanation ? ` (${s.explanation})` : ""}`).join("\n")
      : "";

    const textToCopy = [
      `Problem: ${solution.problemDetected}`,
      `Topic: ${solution.topic || "Mathematics"}`,
      `Final Answer: ${solution.finalAnswer}`,
      stepsText ? `\nSteps:\n${stepsText}` : "",
      `\nExplanation: ${explanationMode === "simple" ? solution.simpleExplanation : solution.detailedExplanation}`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(textToCopy);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleToggleSave = () => {
    if (onSaveToHistory) {
      const willBeSaved = !isSaved;
      onSaveToHistory(solution);
      setSaveToast(willBeSaved ? "Saved to History!" : "Removed from History");
      setTimeout(() => setSaveToast(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070B] text-white flex flex-col justify-between p-4 md:p-6 max-w-2xl mx-auto relative">
      {/* TOAST FEEDBACK */}
      {saveToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#00F0FF] text-[#05070B] text-xs font-extrabold uppercase tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.6)] flex items-center gap-1.5"
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>{saveToast}</span>
        </motion.div>
      )}

      {/* TOP BAR */}
      <header className="flex items-center justify-between pb-4 border-b border-white/10 sticky top-0 bg-[#05070B]/90 backdrop-blur-md z-20 pt-2">
        <button
          onClick={onBackToCamera}
          className="w-9 h-9 bg-white/5 border border-white/10 rounded-full text-white/70 hover:text-white transition flex items-center justify-center active:scale-95"
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-light tracking-wide text-white">
            <span className="text-[#00F0FF] font-bold">MATHICSOLVE</span> AI
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyFullSolution}
            className={`h-9 px-3 rounded-full border text-xs font-semibold tracking-wider uppercase transition flex items-center gap-1.5 active:scale-95 ${
              copiedFull
                ? "bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]"
                : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Copy Full Solution to Clipboard"
          >
            {copiedFull ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy All</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleSave}
            className={`h-9 px-3 rounded-full border transition flex items-center gap-1.5 active:scale-95 text-xs font-semibold uppercase tracking-wider ${
              isSaved
                ? "bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]"
                : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
            }`}
            title={isSaved ? "Remove from Saved History" : "Save Solution to History"}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#00F0FF]" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN SOLUTION CONTENT */}
      <main className="flex-1 my-6 space-y-6">
        {/* YOUR PROBLEM SECTION */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
              Current Problem
            </span>
            <span className="text-[10px] font-bold text-[#00F0FF] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/20">
              {solution.topic || "Algebra"}
            </span>
          </div>

          <div className="text-2xl md:text-3xl font-light border-b border-white/10 pb-4 text-white tracking-wide font-mono">
            {solution.problemDetected}
          </div>
        </section>

        {/* HERO ANSWER CARD (LARGEST VISUAL ELEMENT) */}
        <section>
          <div className="bg-[#00F0FF]/5 border border-[#00F0FF]/30 rounded-[24px] p-6 md:p-8 flex flex-col items-center justify-center gap-2 shadow-[0_10px_40px_rgba(0,240,255,0.05)] relative overflow-hidden">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#00F0FF] font-bold">
              Final Answer
            </span>

            <div className="my-2">
              <p className="text-5xl md:text-6xl font-bold tracking-tighter text-[#00F0FF] font-mono">
                {solution.finalAnswer}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={handleCopyAnswer}
                className="px-5 py-2 bg-[#00F0FF] text-[#05070B] rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:bg-[#00F0FF]/90 transition active:scale-95 flex items-center gap-1.5 shadow-lg"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#05070B]" />
                    <span>Copied Answer!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#05070B]" />
                    <span>Copy Answer</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyFullSolution}
                className="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition active:scale-95 flex items-center gap-1.5 shadow-lg"
              >
                {copiedFull ? (
                  <>
                    <Check className="w-4 h-4 text-[#00F0FF]" />
                    <span className="text-[#00F0FF]">Copied Full Solution!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/80" />
                    <span>Copy Full Solution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* VISUAL ALGEBRA D3 GRAPH INTEGRATION */}
        <section>
          <MathGraphD3
            problemText={solution.problemDetected}
            finalAnswer={solution.finalAnswer}
            topic={solution.topic}
          />
        </section>

        {/* STEP-BY-STEP SOLUTION SECTION */}
        <section className="flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
            Step-by-step Solution
          </span>

          <div className="flex flex-col gap-3">
            {solution.steps && solution.steps.length > 0 ? (
              solution.steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1 + idx * 0.08,
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  className="flex items-start gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-[#00F0FF]/30 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00F0FF] font-mono font-bold shrink-0 text-sm">
                    {step.stepNumber || `0${idx + 1}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/40 uppercase tracking-wide font-medium">
                      {step.title}
                    </div>

                    <div className="text-lg font-medium tracking-tight text-white font-mono my-1">
                      {step.expression}
                    </div>

                    {step.explanation && (
                      <p className="text-xs text-gray-400 leading-relaxed mt-1">
                        {step.explanation}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center text-xs text-gray-400">
                Detailed step calculations computed above.
              </div>
            )}
          </div>
        </section>

        {/* AI EXPLANATION SECTION */}
        <section className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#00F0FF] font-bold">
              AI Explanation
            </div>

            {/* TOGGLE BUTTONS: [ Simple ] [ Detailed ] */}
            <div className="flex items-center p-0.5 rounded-full bg-black/40 border border-white/10">
              <button
                onClick={() => setExplanationMode("simple")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                  explanationMode === "simple"
                    ? "bg-[#00F0FF] text-[#05070B]"
                    : "text-white/40 hover:text-white"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setExplanationMode("detailed")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                  explanationMode === "detailed"
                    ? "bg-[#00F0FF] text-[#05070B]"
                    : "text-white/40 hover:text-white"
                }`}
              >
                Detailed
              </button>
            </div>
          </div>

          <p className="text-sm text-white/70 leading-relaxed italic">
            "{explanationMode === "simple" ? solution.simpleExplanation : solution.detailedExplanation}"
          </p>

          {solution.verification && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Verification:</strong> {solution.verification}
              </span>
            </div>
          )}
        </section>
      </main>

      {/* BOTTOM ACTIONS */}
      <footer className="sticky bottom-0 bg-[#05070B]/95 backdrop-blur-md pt-3 pb-4 border-t border-white/10 flex gap-3">
        <button
          onClick={onBackToCamera}
          className="flex-1 py-3.5 bg-white text-[#05070B] rounded-2xl font-bold text-center text-xs tracking-widest uppercase hover:bg-white/90 active:scale-[0.99] transition shadow-lg"
        >
          Scan Another
        </button>

        <button
          onClick={onOpenManualInput}
          className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-center text-xs tracking-widest uppercase text-white hover:bg-white/10 active:scale-[0.99] transition"
        >
          Enter Manually
        </button>
      </footer>
    </div>
  );
};
