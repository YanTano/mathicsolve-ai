import React from "react";
import { X, Settings, Zap, Volume2, Sparkles, Cpu, Sun, Moon, User, Database, Shield } from "lucide-react";
import { UserProfile } from "../types";

interface SettingsModalProps {
  onClose: () => void;
  flashMode: boolean;
  onToggleFlash: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  explanationDepth: "simple" | "detailed";
  onChangeExplanationDepth: (depth: "simple" | "detailed") => void;
  theme: "dark" | "light";
  onChangeTheme: (theme: "dark" | "light") => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenAdminManager?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  flashMode,
  onToggleFlash,
  soundEnabled,
  onToggleSound,
  explanationDepth,
  onChangeExplanationDepth,
  theme,
  onChangeTheme,
  currentUser,
  onOpenAuth,
  onOpenAdminManager,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card border-slate-700/80 rounded-[24px] overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.2em] text-[#00F0FF] font-bold">MATHICSOLVE AI</span>
            <span className="text-[8px] tracking-[0.1em] text-white/40 uppercase">App Preferences & Database</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SETTINGS OPTIONS */}
        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* USER ACCOUNT & FIREBASE BUTTONS */}
          <div className="p-3.5 rounded-2xl bg-[#00F0FF]/5 border border-[#00F0FF]/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00F0FF]" />
                <span className="text-xs font-bold text-white">Account</span>
              </div>
              {currentUser && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  {currentUser.role}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00F0FF]" />
                  <span>{currentUser ? currentUser.email : "Sign In / Register"}</span>
                </div>
                <span className="text-[10px] text-[#00F0FF]">{currentUser ? "Profile" : "Login"}</span>
              </button>

              {currentUser?.role === "admin" && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminManager?.();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 font-medium flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Built-in Admin Manager</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold">Configure</span>
                </button>
              )}
            </div>
          </div>
          {/* THEME TOGGLE */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-[#00F0FF]" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className="text-xs font-bold text-white">Appearance Theme</p>
                <p className="text-[10px] text-gray-400">
                  {theme === "dark" ? "Deep Space (Dark)" : "Clean Slate (Light)"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10">
              <button
                onClick={() => onChangeTheme("dark")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                  theme === "dark"
                    ? "bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => onChangeTheme("light")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                  theme === "light"
                    ? "bg-amber-500/20 border border-amber-500 text-amber-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* AI MODEL */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-[#00F0FF]" />
              <div>
                <p className="text-xs font-bold text-white">AI Engine Model</p>
                <p className="text-[10px] text-gray-400">Gemini 3.6 Flash Math Vision</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-[#00F0FF] bg-[#00F0FF]/15 border border-[#00F0FF]/30 px-2 py-0.5 rounded-full">
              ACTIVE
            </span>
          </div>

          {/* EXPLANATION DEPTH PREFERENCE */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              <p className="text-xs font-bold text-white">Default Explanation Depth</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeExplanationDepth("simple")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${
                  explanationDepth === "simple"
                    ? "bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF]"
                    : "bg-slate-950 border border-white/10 text-gray-400"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => onChangeExplanationDepth("detailed")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${
                  explanationDepth === "detailed"
                    ? "bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF]"
                    : "bg-slate-950 border border-white/10 text-gray-400"
                }`}
              >
                Detailed
              </button>
            </div>
          </div>

          {/* CAMERA FLASH */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-white">Camera Torch Flash</p>
                <p className="text-[10px] text-gray-400">Enhance low-light scanning</p>
              </div>
            </div>
            <button
              onClick={onToggleFlash}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                flashMode ? "bg-[#00F0FF]" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  flashMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* SOUND FEEDBACK */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#00F0FF]" />
              <div>
                <p className="text-xs font-bold text-white">Scan Audio Feedback</p>
                <p className="text-[10px] text-gray-400">Play tone on successful solve</p>
              </div>
            </div>
            <button
              onClick={onToggleSound}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                soundEnabled ? "bg-[#00F0FF]" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  soundEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-gray-500 font-mono">
            MATHICSOLVE AI • Scan it. Solve it. Understand it.
          </p>
        </div>
      </div>
    </div>
  );
};
