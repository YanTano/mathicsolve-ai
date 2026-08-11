import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Sparkles,
  Calculator,
  Delete,
  Space,
  Baseline,
  Binary,
  Sigma,
  X,
  Check,
  SlidersHorizontal,
  Mic,
  MicOff,
} from "lucide-react";

interface ManualInputViewProps {
  onSolveText: (mathText: string, topicHint?: string) => void;
  onBackToCamera: () => void;
  isSolving: boolean;
}

const QWERTY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const NUMBER_OPERATOR_KEYS = [
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "+", value: " + " },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "-", value: " - " },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "×", value: " * " },
  { label: "0", value: "0" },
  { label: ".", value: "." },
  { label: "=", value: " = " },
  { label: "÷", value: " / " },
];

const BASIC_MATH_SYMBOLS = [
  { label: "+", value: " + " },
  { label: "-", value: " - " },
  { label: "×", value: " * " },
  { label: "÷", value: " / " },
  { label: "=", value: " = " },
  { label: "≠", value: " ≠ " },
  { label: "<", value: " < " },
  { label: ">", value: " > " },
  { label: "≤", value: " ≤ " },
  { label: "≥", value: " ≥ " },
];

const ALGEBRA_SYMBOLS = [
  { label: "√", value: "√(" },
  { label: "±", value: "±" },
  { label: "∛", value: "∛(" },
  { label: "x²", value: "²" },
  { label: "x³", value: "³" },
  { label: "|x|", value: "|" },
  { label: "∝", value: "∝" },
  { label: "∈", value: "∈" },
  { label: "∉", value: "∉" },
  { label: "x^", value: "^" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
];

const ADVANCED_SYMBOLS = [
  { label: "∑", value: "∑", isBuilder: "sum" },
  { label: "∏", value: "∏", isBuilder: "product" },
  { label: "∞", value: "∞" },
  { label: "!", value: "!" },
  { label: "∫", value: "∫ ", isBuilder: "integral" },
  { label: "≈", value: "≈" },
  { label: "≡", value: "≡" },
  { label: "∇", value: "∇" },
  { label: "∂", value: "∂" },
  { label: "∅", value: "∅" },
  { label: "∧", value: "∧" },
  { label: "∨", value: "∨" },
  { label: "∀", value: "∀" },
  { label: "∃", value: "∃" },
  { label: "∴", value: "∴" },
  { label: "∵", value: "∵" },
  { label: "→", value: "→" },
  { label: "⇔", value: "⇔" },
  { label: "sin", value: "sin(" },
  { label: "cos", value: "cos(" },
  { label: "tan", value: "tan(" },
  { label: "log_b", value: "log_", isBuilder: "log" },
  { label: "lim", value: "lim", isBuilder: "limit" },
  { label: "ln", value: "ln(" },
];

const PHYSICS_SYMBOLS = [
  { label: "Ω", value: "Ω" },
  { label: "µ", value: "µ" },
  { label: "π", value: "π" },
  { label: "θ", value: "θ" },
  { label: "λ", value: "λ" },
  { label: "σ", value: "σ" },
  { label: "Δ", value: "Δ" },
];

const QUICK_VARIABLES = [
  "a", "b", "c", "x", "y", "z", "m", "n", "k", "t"
];

const TOPIC_SUGGESTIONS = [
  "Linear Equation",
  "Algebraic Expression",
  "Quadratic Equation",
  "Fractions",
  "Calculus",
  "Trigonometry",
  "Word Problem",
];

export const ManualInputView: React.FC<ManualInputViewProps> = ({
  onSolveText,
  onBackToCamera,
  isSolving,
}) => {
  const [problemText, setProblemText] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("Algebraic Expression");
  const [keypadMode, setKeypadMode] = useState<"alphabet" | "symbols" | "numbers">("alphabet");
  const [symbolCategory, setSymbolCategory] = useState<"all" | "basic" | "algebra" | "advanced" | "physics">("all");
  const [isUppercase, setIsUppercase] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech Recognition Dictation State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const dictationInitialTextRef = useRef<string>("");
  const problemTextRef = useRef<string>("");
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    problemTextRef.current = problemText;
  }, [problemText]);

  // Structured Builder Modal State
  const [builderModal, setBuilderModal] = useState<{
    type: "sum" | "integral" | "product" | "limit" | "log" | "root" | null;
    upper: string;
    lower: string;
    expr: string;
    variable: string;
  }>({
    type: null,
    upper: "",
    lower: "",
    expr: "",
    variable: "dx",
  });

  const openBuilder = (type: "sum" | "integral" | "product" | "limit" | "log" | "root") => {
    if (type === "sum") {
      setBuilderModal({ type: "sum", upper: "n", lower: "i=1", expr: "i^2", variable: "i" });
    } else if (type === "integral") {
      setBuilderModal({ type: "integral", upper: "π", lower: "0", expr: "x^2", variable: "dx" });
    } else if (type === "product") {
      setBuilderModal({ type: "product", upper: "n", lower: "k=1", expr: "k + 1", variable: "k" });
    } else if (type === "limit") {
      setBuilderModal({ type: "limit", upper: "", lower: "x → 0", expr: "sin(x)/x", variable: "x" });
    } else if (type === "log") {
      setBuilderModal({ type: "log", upper: "", lower: "2", expr: "64", variable: "" });
    } else if (type === "root") {
      setBuilderModal({ type: "root", upper: "3", lower: "", expr: "27", variable: "" });
    }
  };

  const handleApplyBuilder = () => {
    const { type, upper, lower, expr, variable } = builderModal;
    let formatted = "";

    if (type === "sum") {
      const up = upper.trim() ? `^{${upper.trim()}}` : "";
      const low = lower.trim() ? `_{${lower.trim()}}` : "";
      formatted = `∑${low}${up} (${expr.trim() || "x"})`;
    } else if (type === "integral") {
      const up = upper.trim() ? `^{${upper.trim()}}` : "";
      const low = lower.trim() ? `_{${lower.trim()}}` : "";
      const v = variable.trim() ? ` ${variable.trim()}` : " dx";
      formatted = `∫${low}${up} (${expr.trim() || "f(x)"})${v}`;
    } else if (type === "product") {
      const up = upper.trim() ? `^{${upper.trim()}}` : "";
      const low = lower.trim() ? `_{${lower.trim()}}` : "";
      formatted = `∏${low}${up} (${expr.trim() || "x"})`;
    } else if (type === "limit") {
      const low = lower.trim() ? `_{${lower.trim()}}` : "";
      formatted = `lim${low} (${expr.trim() || "f(x)"})`;
    } else if (type === "log") {
      const base = lower.trim() ? `_${lower.trim()}` : "";
      formatted = `log${base}(${expr.trim() || "x"})`;
    } else if (type === "root") {
      const deg = upper.trim() === "3" ? "∛" : upper.trim() === "4" ? "⁴√" : upper.trim() ? `${upper.trim()}√` : "√";
      formatted = `${deg}(${expr.trim() || "x"})`;
    }

    if (formatted) {
      handleInsert(formatted);
    }
    setBuilderModal({ type: null, upper: "", lower: "", expr: "", variable: "dx" });
  };

  const handleInsert = (str: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setProblemText((prev) => prev + str);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = problemText;
    const newText = text.substring(0, start) + str + text.substring(end);
    setProblemText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + str.length, start + str.length);
    }, 0);
  };

  const handleBackspace = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setProblemText((prev) => prev.slice(0, -1));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end && start > 0) {
      const newText = problemText.substring(0, start - 1) + problemText.substring(end);
      setProblemText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - 1, start - 1);
      }, 0);
    } else if (start !== end) {
      const newText = problemText.substring(0, start) + problemText.substring(end);
      setProblemText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start);
      }, 0);
    }
  };

  const normalizeSpokenMath = (transcript: string): string => {
    let text = transcript;
    const phraseMap: [RegExp, string][] = [
      [/\bplus\b/gi, " + "],
      [/\bminus\b/gi, " - "],
      [/\btimes\b|\bmultiplied by\b/gi, " * "],
      [/\bdivided by\b|\bover\b/gi, " / "],
      [/\bequals?\b|\bequal to\b/gi, " = "],
      [/\bnot equal to\b/gi, " ≠ "],
      [/\bgreater than or equal to\b/gi, " ≥ "],
      [/\bless than or equal to\b/gi, " ≤ "],
      [/\bgreater than\b/gi, " > "],
      [/\bless than\b/gi, " < "],
      [/\bsquare root of\b/gi, "√("],
      [/\bcube root of\b/gi, "∛("],
      [/\bsquared\b/gi, "²"],
      [/\bcubed\b/gi, "³"],
      [/\bto the power of\b|\braised to\b/gi, "^"],
      [/\bopen parenthesis\b|\bopen bracket\b/gi, "("],
      [/\bclose parenthesis\b|\bclose bracket\b/gi, ")"],
      [/\bsine of\b|\bsin of\b/gi, "sin("],
      [/\bcosine of\b|\bcos of\b/gi, "cos("],
      [/\btangent of\b|\btan of\b/gi, "tan("],
      [/\blog of\b/gi, "log("],
      [/\bnatural log of\b|\bln of\b/gi, "ln("],
      [/\bintegral of\b/gi, "∫ "],
      [/\bsummation of\b|\bsum of\b/gi, "∑ "],
      [/\binfinity\b/gi, "∞"],
      [/\bpi\b/gi, "π"],
      [/\btheta\b/gi, "θ"],
      [/\bdelta\b/gi, "Δ"],
      [/\balpha\b/gi, "α"],
      [/\bbeta\b/gi, "β"],
    ];

    for (const [pattern, replacement] of phraseMap) {
      text = text.replace(pattern, replacement);
    }

    const numberWords: Record<string, string> = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      ten: "10",
    };

    for (const [word, digit] of Object.entries(numberWords)) {
      const reg = new RegExp(`\\b${word}\\b`, "gi");
      text = text.replace(reg, digit);
    }

    return text.replace(/\s+/g, " ").trim();
  };

  // Cleanup speech resources on component unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const toggleSpeechDictation = async () => {
    setSpeechError(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        "Speech recognition is not supported in this browser. Please try Google Chrome or Edge."
      );
      return;
    }

    // Stop Dictation
    if (isListening) {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Stop speech error:", e);
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setIsListening(false);
      setLiveTranscript("");
      return;
    }

    // Start Dictation
    try {
      // 1. Explicitly request microphone stream permission from browser
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = micStream;
        } catch (micErr: any) {
          console.warn("Microphone access denied:", micErr);
          setSpeechError(
            "Microphone permission was denied. Please allow microphone access in your browser bar."
          );
          setIsListening(false);
          isListeningRef.current = false;
          return;
        }
      }

      isListeningRef.current = true;
      dictationInitialTextRef.current = problemTextRef.current;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript("");
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        if (!isListeningRef.current) return;

        let rawFullText = "";
        for (let i = 0; i < event.results.length; i++) {
          rawFullText += event.results[i][0].transcript + " ";
        }

        const normalized = normalizeSpokenMath(rawFullText);
        setLiveTranscript(normalized);

        const initial = dictationInitialTextRef.current;
        const space = initial && !initial.endsWith(" ") && normalized ? " " : "";
        const updatedText = initial + space + normalized;

        setProblemText(updatedText);

        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          isListeningRef.current = false;
          setIsListening(false);
          setSpeechError(
            "Microphone permission was denied. Please check your browser settings."
          );
        } else if (event.error === "audio-capture") {
          isListeningRef.current = false;
          setIsListening(false);
          setSpeechError("No microphone was detected on this system.");
        } else if (event.error !== "no-speech") {
          console.warn("Minor speech error:", event.error);
        }
      };

      recognition.onend = () => {
        // If the user did not click Stop, auto-restart speech recognition seamlessly so listening stays active
        if (isListeningRef.current) {
          dictationInitialTextRef.current = problemTextRef.current;
          try {
            recognition.start();
            return;
          } catch (restartErr) {
            console.warn("Failed to auto-restart speech recognition:", restartErr);
          }
        }

        setIsListening(false);
        setLiveTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setSpeechError("Could not initiate voice dictation.");
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problemText.trim()) {
      onSolveText(problemText.trim(), selectedTopic);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070B] text-white flex flex-col justify-between p-4 md:p-6 max-w-xl mx-auto relative">
      {/* BUILDER MODAL OVERLAY */}
      {builderModal.type && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b101b] border border-[#00F0FF]/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.25)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00F0FF]/20 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {builderModal.type === "sum" && "Configure Summation (∑)"}
                    {builderModal.type === "integral" && "Configure Definite Integral (∫)"}
                    {builderModal.type === "product" && "Configure Product Notation (∏)"}
                    {builderModal.type === "limit" && "Configure Limit Notation (lim)"}
                    {builderModal.type === "log" && "Configure Base Logarithm (log_b)"}
                    {builderModal.type === "root" && "Configure Root (ⁿ√x)"}
                  </h3>
                  <p className="text-[10px] text-gray-400">Set limits, bounds & expression parameters</p>
                </div>
              </div>
              <button
                onClick={() => setBuilderModal({ type: null, upper: "", lower: "", expr: "", variable: "dx" })}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL FORM CONTENT */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* LIVE PREVIEW BOX */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#00F0FF] tracking-widest">Live Notation Preview</span>
                <div className="text-xl font-mono text-white font-bold tracking-wide py-1">
                  {builderModal.type === "sum" && (
                    <>
                      ∑
                      <sub className="text-xs text-[#00F0FF] ml-0.5">{builderModal.lower || "i=1"}</sub>
                      <sup className="text-xs text-[#00F0FF]">{builderModal.upper || "n"}</sup>
                      {" "}({builderModal.expr || "i^2"})
                    </>
                  )}
                  {builderModal.type === "integral" && (
                    <>
                      ∫
                      <sub className="text-xs text-[#00F0FF] ml-0.5">{builderModal.lower || "0"}</sub>
                      <sup className="text-xs text-[#00F0FF]">{builderModal.upper || "π"}</sup>
                      {" "}({builderModal.expr || "x^2"}) {builderModal.variable || "dx"}
                    </>
                  )}
                  {builderModal.type === "product" && (
                    <>
                      ∏
                      <sub className="text-xs text-[#00F0FF] ml-0.5">{builderModal.lower || "k=1"}</sub>
                      <sup className="text-xs text-[#00F0FF]">{builderModal.upper || "n"}</sup>
                      {" "}({builderModal.expr || "k+1"})
                    </>
                  )}
                  {builderModal.type === "limit" && (
                    <>
                      lim
                      <sub className="text-xs text-[#00F0FF] ml-0.5">{builderModal.lower || "x → 0"}</sub>
                      {" "}({builderModal.expr || "sin(x)/x"})
                    </>
                  )}
                  {builderModal.type === "log" && (
                    <>
                      log
                      <sub className="text-xs text-[#00F0FF] ml-0.5">{builderModal.lower || "2"}</sub>
                      ({builderModal.expr || "64"})
                    </>
                  )}
                  {builderModal.type === "root" && (
                    <>
                      <sup className="text-xs text-[#00F0FF] mr-0.5">{builderModal.upper || "3"}</sup>
                      √({builderModal.expr || "27"})
                    </>
                  )}
                </div>
              </div>

              {/* INPUT FIELDS ACCORDING TO TYPE */}
              {/* UPPER BOUND / LAST VALUE */}
              {(builderModal.type === "sum" || builderModal.type === "integral" || builderModal.type === "product" || builderModal.type === "root") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                    <span>
                      {builderModal.type === "integral" ? "Upper Limit (b)" : builderModal.type === "root" ? "Root Degree (n)" : "Upper Bound / Last Value (n)"}
                    </span>
                    <span className="text-[10px] text-[#00F0FF]">Top Value</span>
                  </label>
                  <input
                    type="text"
                    value={builderModal.upper}
                    onChange={(e) => setBuilderModal((prev) => ({ ...prev, upper: e.target.value }))}
                    placeholder={builderModal.type === "integral" ? "e.g. π or 1" : builderModal.type === "root" ? "e.g. 3 or 4" : "e.g. n or 100"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:border-[#00F0FF] focus:outline-none"
                  />
                  {/* PRESET CHIPS */}
                  <div className="flex gap-1.5 flex-wrap">
                    {builderModal.type === "integral" ? (
                      ["π", "2π", "1", "∞", "b"].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setBuilderModal((prev) => ({ ...prev, upper: chip }))}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                        >
                          {chip}
                        </button>
                      ))
                    ) : builderModal.type === "root" ? (
                      ["3", "4", "5", "n"].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setBuilderModal((prev) => ({ ...prev, upper: chip }))}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                        >
                          {chip}
                        </button>
                      ))
                    ) : (
                      ["n", "10", "100", "∞", "N"].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setBuilderModal((prev) => ({ ...prev, upper: chip }))}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                        >
                          {chip}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* LOWER BOUND / START INDEX / BASE / APPROACH */}
              {(builderModal.type === "sum" || builderModal.type === "integral" || builderModal.type === "product" || builderModal.type === "limit" || builderModal.type === "log") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                    <span>
                      {builderModal.type === "integral"
                        ? "Lower Limit (a)"
                        : builderModal.type === "limit"
                        ? "Variable Approach"
                        : builderModal.type === "log"
                        ? "Logarithm Base (b)"
                        : "Lower Index / First Value"}
                    </span>
                    <span className="text-[10px] text-[#00F0FF]">Bottom Value</span>
                  </label>
                  <input
                    type="text"
                    value={builderModal.lower}
                    onChange={(e) => setBuilderModal((prev) => ({ ...prev, lower: e.target.value }))}
                    placeholder={
                      builderModal.type === "integral"
                        ? "e.g. 0 or -∞"
                        : builderModal.type === "limit"
                        ? "e.g. x → 0 or n → ∞"
                        : builderModal.type === "log"
                        ? "e.g. 2 or 10"
                        : "e.g. i=1 or k=0"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:border-[#00F0FF] focus:outline-none"
                  />
                  {/* PRESET CHIPS */}
                  <div className="flex gap-1.5 flex-wrap">
                    {builderModal.type === "sum" && ["i=1", "k=1", "n=0", "1"].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBuilderModal((prev) => ({ ...prev, lower: chip }))}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                      >
                        {chip}
                      </button>
                    ))}
                    {builderModal.type === "integral" && ["0", "a", "-∞", "1"].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBuilderModal((prev) => ({ ...prev, lower: chip }))}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                      >
                        {chip}
                      </button>
                    ))}
                    {builderModal.type === "limit" && ["x → 0", "x → ∞", "n → ∞", "t → 0"].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBuilderModal((prev) => ({ ...prev, lower: chip }))}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                      >
                        {chip}
                      </button>
                    ))}
                    {builderModal.type === "log" && ["2", "10", "e", "a"].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBuilderModal((prev) => ({ ...prev, lower: chip }))}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* EXPRESSION / TERM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Expression / Term</label>
                <input
                  type="text"
                  value={builderModal.expr}
                  onChange={(e) => setBuilderModal((prev) => ({ ...prev, expr: e.target.value }))}
                  placeholder="e.g. x^2 + 1 or i^2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:border-[#00F0FF] focus:outline-none"
                />
              </div>

              {/* DIFFERENTIAL FOR INTEGRAL */}
              {builderModal.type === "integral" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Differential</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={builderModal.variable}
                      onChange={(e) => setBuilderModal((prev) => ({ ...prev, variable: e.target.value }))}
                      placeholder="e.g. dx"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:border-[#00F0FF] focus:outline-none"
                    />
                    {["dx", "dt", "dy", "dθ"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBuilderModal((prev) => ({ ...prev, variable: d }))}
                        className="px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold hover:bg-[#00F0FF]/20 hover:text-[#00F0FF]"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-white/10 bg-slate-950 flex gap-2">
              <button
                type="button"
                onClick={() => setBuilderModal({ type: null, upper: "", lower: "", expr: "", variable: "dx" })}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBuilder}
                className="flex-[2] py-3 rounded-xl bg-[#00F0FF] text-[#05070B] text-xs font-extrabold uppercase tracking-wider hover:bg-[#00f0ff]/90 transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                <Check className="w-4 h-4" />
                <span>Insert Notation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <header className="flex items-center justify-between pb-4 border-b border-white/10">
        <button
          onClick={onBackToCamera}
          className="w-9 h-9 bg-white/5 border border-white/10 rounded-full text-white/70 hover:text-white transition flex items-center justify-center active:scale-95"
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-light tracking-wide text-white">
          <span className="text-[#00F0FF] font-bold">MATHICSOLVE</span> AI
        </h1>

        <div className="w-20" />
      </header>

      {/* FORM */}
      <main className="flex-1 my-6 space-y-5">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
            Manual Input Mode
          </span>
          <h2 className="text-xl font-light tracking-wide text-white">
            Enter Math Problem
          </h2>
        </div>

        {/* TOPIC SELECTOR PILLS */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#00F0FF] font-bold">
            Topic Hint
          </span>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {TOPIC_SUGGESTIONS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition shrink-0 ${
                  selectedTopic === topic
                    ? "bg-[#00F0FF] text-[#05070B]"
                    : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT BOX */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="e.g. 2x + 5 = 15 or dictate with mic..."
              rows={3}
              className={`w-full p-4 pr-36 rounded-2xl bg-white/5 text-white font-mono text-lg placeholder:text-white/20 focus:outline-none resize-none transition-all duration-300 border ${
                isListening
                  ? "border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50"
                  : "border-[#00F0FF]/30 focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]"
              }`}
            />
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={toggleSpeechDictation}
                title={isListening ? "Stop Voice Dictation" : "Dictate Math via Microphone"}
                className={`relative flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition active:scale-95 shadow-md ${
                  isListening
                    ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                    : "bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/30"
                }`}
              >
                {isListening && (
                  <span className="absolute -inset-0.5 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
                )}
                <Mic className={`w-3.5 h-3.5 ${isListening ? "text-white scale-110 drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse" : "text-[#00F0FF]"}`} />
                <span>{isListening ? "Listening..." : "Dictate"}</span>
              </button>

              {problemText && (
                <button
                  type="button"
                  onClick={() => setProblemText("")}
                  className="text-[10px] uppercase font-bold text-white/40 hover:text-white bg-white/10 px-2.5 py-1 rounded-full transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* VOICE DICTATION FEEDBACK BANNER */}
          {isListening && (
            <div className="p-3 bg-red-950/20 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] rounded-xl flex items-center justify-between gap-3 text-xs text-red-200">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  {/* Equalizer sound bars */}
                  <div className="flex items-end gap-0.5 h-3 ml-1">
                    <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-full" />
                    <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_300ms] h-2/3" />
                    <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-5/6" />
                  </div>
                </div>
                <p className="truncate font-mono">
                  {liveTranscript ? (
                    <span className="text-white font-bold">{liveTranscript}</span>
                  ) : (
                    <span className="text-red-200/80 italic">Speak math expression e.g. "two x plus five equals fifteen"...</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSpeechDictation}
                className="px-2.5 py-0.5 rounded-lg bg-red-500/30 text-red-100 border border-red-500/50 font-bold hover:bg-red-500/50 text-[11px] shrink-0 transition"
              >
                Done
              </button>
            </div>
          )}

          {speechError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-300">
              <div className="flex items-center gap-2">
                <MicOff className="w-4 h-4 text-red-400 shrink-0" />
                <span>{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* QUICK VARIABLE BAR */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold shrink-0 mr-1">
              Variables:
            </span>
            {QUICK_VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleInsert(isUppercase ? v.toUpperCase() : v)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs hover:bg-[#00F0FF]/20 hover:border-[#00F0FF] active:scale-95 transition shrink-0 flex items-center justify-center font-bold"
              >
                {isUppercase ? v.toUpperCase() : v}
              </button>
            ))}
          </div>

          {/* KEYPAD MODE SWITCHER */}
          <div className="p-1 rounded-xl bg-white/5 border border-white/10 grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setKeypadMode("alphabet")}
              className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                keypadMode === "alphabet"
                  ? "bg-[#00F0FF] text-[#05070B]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Baseline className="w-3.5 h-3.5" />
              <span>Alphabet</span>
            </button>
            <button
              type="button"
              onClick={() => setKeypadMode("numbers")}
              className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                keypadMode === "numbers"
                  ? "bg-[#00F0FF] text-[#05070B]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>123 / Ops</span>
            </button>
            <button
              type="button"
              onClick={() => setKeypadMode("symbols")}
              className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                keypadMode === "symbols"
                  ? "bg-[#00F0FF] text-[#05070B]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>Symbols</span>
            </button>
          </div>

          {/* KEYPAD CONTENT */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            {keypadMode === "alphabet" && (
              <div className="space-y-1.5">
                {QWERTY_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1">
                    {row.map((char) => {
                      const displayChar = isUppercase ? char.toUpperCase() : char;
                      return (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleInsert(displayChar)}
                          className="flex-1 max-w-[40px] h-10 rounded-lg bg-white/10 border border-white/10 text-white font-mono font-bold text-sm hover:bg-[#00F0FF]/20 hover:border-[#00F0FF] active:scale-95 transition flex items-center justify-center"
                        >
                          {displayChar}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {/* BOTTOM ACTION ROW FOR ALPHABET */}
                <div className="flex justify-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsUppercase(!isUppercase)}
                    className={`px-3 h-10 rounded-lg border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center ${
                      isUppercase
                        ? "bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]"
                        : "bg-white/10 border-white/10 text-white/70 hover:text-white"
                    }`}
                  >
                    {isUppercase ? "a-z" : "A-Z"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsert(" ")}
                    className="flex-1 h-10 rounded-lg bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/15 active:scale-95 transition flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider"
                  >
                    <Space className="w-4 h-4" />
                    <span>Space</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="px-3 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 active:scale-95 transition flex items-center justify-center"
                    title="Backspace"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {keypadMode === "numbers" && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {NUMBER_OPERATOR_KEYS.map((k) => (
                    <button
                      key={k.label}
                      type="button"
                      onClick={() => handleInsert(k.value)}
                      className="p-3 rounded-xl bg-white/10 border border-white/10 text-white font-mono font-bold text-base hover:bg-[#00F0FF]/20 hover:border-[#00F0FF] active:scale-95 transition text-center"
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInsert(" ")}
                    className="flex-1 h-10 rounded-lg bg-white/10 border border-white/10 text-white/70 hover:text-white active:scale-95 transition flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider"
                  >
                    <Space className="w-4 h-4" />
                    <span>Space</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="px-4 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 active:scale-95 transition flex items-center justify-center"
                    title="Backspace"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {keypadMode === "symbols" && (() => {
              let activeSymbols = [
                ...BASIC_MATH_SYMBOLS,
                ...ALGEBRA_SYMBOLS,
                ...ADVANCED_SYMBOLS,
                ...PHYSICS_SYMBOLS,
              ];
              if (symbolCategory === "basic") activeSymbols = BASIC_MATH_SYMBOLS;
              if (symbolCategory === "algebra") activeSymbols = ALGEBRA_SYMBOLS;
              if (symbolCategory === "advanced") activeSymbols = ADVANCED_SYMBOLS;
              if (symbolCategory === "physics") activeSymbols = PHYSICS_SYMBOLS;

              return (
                <div className="space-y-2.5">
                  {/* CATEGORY TABS */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {[
                      { id: "all", label: "All" },
                      { id: "basic", label: "Basic 🔢" },
                      { id: "algebra", label: "Algebra 🧠" },
                      { id: "advanced", label: "Advanced 🔍" },
                      { id: "physics", label: "Physics ⚡" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSymbolCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition ${
                          symbolCategory === cat.id
                            ? "bg-[#00F0FF] text-[#05070B]"
                            : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* STRUCTURED BUILDERS QUICK ACCESS BAR */}
                  <div className="p-2 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 space-y-1">
                    <span className="text-[9px] uppercase font-extrabold text-[#00F0FF] tracking-widest flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Configure Limits & Bounds Builders:</span>
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      <button
                        type="button"
                        onClick={() => openBuilder("sum")}
                        className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold font-mono hover:bg-[#00F0FF] hover:text-[#05070B] transition shrink-0 flex items-center gap-1"
                      >
                        <span>∑ Summation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBuilder("integral")}
                        className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold font-mono hover:bg-[#00F0FF] hover:text-[#05070B] transition shrink-0 flex items-center gap-1"
                      >
                        <span>∫ Integral</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBuilder("product")}
                        className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold font-mono hover:bg-[#00F0FF] hover:text-[#05070B] transition shrink-0 flex items-center gap-1"
                      >
                        <span>∏ Product</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBuilder("limit")}
                        className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold font-mono hover:bg-[#00F0FF] hover:text-[#05070B] transition shrink-0 flex items-center gap-1"
                      >
                        <span>lim Limit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBuilder("log")}
                        className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold font-mono hover:bg-[#00F0FF] hover:text-[#05070B] transition shrink-0 flex items-center gap-1"
                      >
                        <span>log_b Log</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBuilder("root")}
                        className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold font-mono hover:bg-[#00F0FF] hover:text-[#05070B] transition shrink-0 flex items-center gap-1"
                      >
                        <span>ⁿ√ Root</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeSymbols.map((k, idx) => (
                      <button
                        key={`${k.label}-${idx}`}
                        type="button"
                        onClick={() => {
                          if ((k as any).isBuilder) {
                            openBuilder((k as any).isBuilder);
                          } else {
                            handleInsert(k.value);
                          }
                        }}
                        className={`p-2.5 rounded-xl border font-mono font-bold text-sm active:scale-95 transition text-center flex items-center justify-center ${
                          (k as any).isBuilder
                            ? "bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/30"
                            : "bg-white/10 border-white/10 text-white hover:bg-[#00F0FF]/20 hover:border-[#00F0FF]"
                        }`}
                        title={(k as any).isBuilder ? `Configure ${k.label}` : k.label}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleInsert(" ")}
                      className="flex-1 h-10 rounded-lg bg-white/10 border border-white/10 text-white/70 hover:text-white active:scale-95 transition flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider"
                    >
                      <Space className="w-4 h-4" />
                      <span>Space</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="px-4 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 active:scale-95 transition flex items-center justify-center"
                      title="Backspace"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={!problemText.trim() || isSolving}
            className="w-full py-4 bg-white text-[#05070B] rounded-2xl font-bold text-center text-xs tracking-widest uppercase hover:bg-white/90 active:scale-[0.99] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSolving ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-[#05070B]" />
                <span>SOLVING WITH AI...</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 text-[#05070B]" />
                <span>SOLVE WITH AI</span>
              </>
            )}
          </button>
        </form>
      </main>

      <footer className="py-2 text-center text-xs text-gray-500 font-mono">
        MATHLENS AI • Real-time Mathematical Engine
      </footer>
    </div>
  );
};

