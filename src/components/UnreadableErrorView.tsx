import React from "react";
import { AlertCircle, RotateCcw, Keyboard, ArrowLeft } from "lucide-react";

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
