import React, { useState } from "react";
import { X, Trash2, Search, ArrowRight, History as HistoryIcon, Calculator } from "lucide-react";
import { ScanHistoryItem } from "../types";

interface HistoryModalProps {
  history: ScanHistoryItem[];
  onSelectHistoryItem: (item: ScanHistoryItem) => void;
  onRemoveHistoryItem?: (id: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  onSelectHistoryItem,
  onRemoveHistoryItem,
  onClearHistory,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredHistory = history.filter(
    (item) =>
      item.problemDetected.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.finalAnswer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-card border-slate-700/80 rounded-[24px] overflow-hidden flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.2em] text-[#00F0FF] font-bold">SCAN HISTORY</span>
            <span className="text-[8px] tracking-[0.1em] text-white/40 uppercase">Saved Math Solutions</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SEARCH & CLEAR */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search past problems or topics..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          {history.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={onClearHistory}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            </div>
          )}
        </div>

        {/* HISTORY LIST */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-[#00F0FF]/40 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#00F0FF] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#00F0FF]/10">
                      {item.topic}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono font-bold text-white truncate">
                    {item.problemDetected}
                  </p>
                  <p className="text-xs text-emerald-400 font-mono font-semibold">
                    Answer: {item.finalAnswer}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onRemoveHistoryItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistoryItem(item.id);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-800/80 text-gray-400 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="w-8 h-8 rounded-full bg-slate-800 text-gray-400 group-hover:text-[#00F0FF] group-hover:bg-[#00F0FF]/20 flex items-center justify-center transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Calculator className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-xs">No scan history found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
