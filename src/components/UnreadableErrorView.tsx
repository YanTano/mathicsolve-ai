import React, { useState } from "react";
import { AlertCircle, RotateCcw, Keyboard, Key, Check } from "lucide-react";

interface UnreadableErrorViewProps {
  onTryAgain: () => void;
  onEnterManually: () => void;
  errorMessage?: string;
}

export const UnreadableErrorView: React.FC<UnreadableErrorViewProps> = ({
  onTryAgain,
  onEnterManually,
  errorMessage,
}) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onTryAgain();
      }, 1000);
    }
  };

  const isApiKeyIssue =
    errorMessage?.includes("Gemini API Key") ||
    errorMessage?.includes("backend server") ||
    !localStorage.getItem("gemini_api_key");

  return (
    <div className="min-h-screen bg-[#05070B] text-white flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center">
      <div className="w-full p-8 rounded-[24px] glass-card border-red-500/20 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-wide">
            Couldn't read the problem clearly.
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            {errorMessage ||
              "Please make sure the math equation is well-lit, centered inside the scan frame, and free of reflections."}
          </p>
        </div>

        {isApiKeyIssue && (
          <div className="p-4 rounded-2xl bg-white/5 border border-[#00F0FF]/30 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00F0FF]">
                <Key className="w-4 h-4" />
                <span>Enter Gemini API Key</span>
              </div>
              {saved && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              For GitHub Pages, paste your free Gemini API key to enable instant picture AI scanning:
            </p>
            <div className="flex gap-2 pt-1">
              <input
                type="password"
                placeholder="Paste API key (AQ... or AIza...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
              />
              <button
                onClick={handleSaveKey}
                className="px-3.5 py-2 bg-[#00F0FF] text-slate-950 font-bold text-xs rounded-xl hover:bg-[#00F0FF]/90 transition active:scale-95"
              >
                Save & Try
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={onTryAgain}
            className="w-full py-3.5 bg-white text-[#05070B] rounded-2xl font-bold text-center text-xs tracking-widest uppercase hover:bg-white/90 active:scale-95 transition shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-[#05070B]" />
            <span>Try Again</span>
          </button>

          <button
            onClick={onEnterManually}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl font-bold text-center text-xs tracking-widest uppercase text-white hover:bg-white/10 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Keyboard className="w-4 h-4 text-[#00F0FF]" />
            <span>Enter Manually</span>
          </button>
        </div>
      </div>
    </div>
  );
};

