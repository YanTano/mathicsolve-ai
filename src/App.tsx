import React, { useState, useEffect } from "react";
import { CameraView } from "./components/CameraView";
import { ResultView } from "./components/ResultView";
import { ManualInputView } from "./components/ManualInputView";
import { UnreadableErrorView } from "./components/UnreadableErrorView";
import { HistoryModal } from "./components/HistoryModal";
import { SettingsModal } from "./components/SettingsModal";
import { AuthModal } from "./components/AuthModal";
import { AdminManagerModal } from "./components/AdminManagerModal";
import { MathSolution, ScanHistoryItem, UserProfile } from "./types";
import { generateFallbackSolution } from "./utils/mathSolver";
import { syncScanToCloud } from "./lib/firebase";

export default function App() {
  const [currentView, setCurrentView] = useState<
    "camera" | "result" | "manual" | "unreadable"
  >("camera");

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<"reading" | "solving" | "idle">("idle");
  const [currentSolution, setCurrentSolution] = useState<MathSolution | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAdminManagerModal, setShowAdminManagerModal] = useState<boolean>(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("mathicsolve_current_user");
      if (saved !== null) {
        if (saved === "null" || saved === "guest") return null;
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to read saved user:", e);
    }
    // Default guest mode if first time visit
    return null;
  });

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("mathicsolve_current_user", JSON.stringify(currentUser));
      } else {
        localStorage.setItem("mathicsolve_current_user", "null");
      }
    } catch (e) {
      console.warn("Failed to persist current user:", e);
    }
  }, [currentUser]);

  // Support direct URL routing to #/admin or ?admin=true
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === "#/admin" || hash === "#admin" || search.includes("admin=true") || search.includes("admin")) {
        if (currentUser?.role === "admin") {
          setShowAdminManagerModal(true);
        } else {
          setShowAuthModal(true);
        }
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentUser]);

  // Settings state
  const [flashMode, setFlashMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [explanationDepth, setExplanationDepth] = useState<"simple" | "detailed">(
    "simple"
  );
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("mathicsolve_theme") || localStorage.getItem("mathlens_theme");
      return saved === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mathicsolve_theme", theme);
    } catch (e) {
      console.warn("Failed to persist theme preference:", e);
    }
    if (theme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  }, [theme]);

  // Scan History in localStorage
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("mathicsolve_history") || localStorage.getItem("mathlens_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mathicsolve_history", JSON.stringify(history));
    } catch (e) {
      console.warn("Failed to persist history:", e);
    }
  }, [history]);

  // Audio chime feedback using Web Audio API
  const playSuccessChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // AudioContext fallback ignored
    }
  };

  // Perform AI Solve API Request
  const handleSolveRequest = async (payload: {
    image?: string;
    text?: string;
    topicHint?: string;
  }) => {
    // Require authentication before scanning/solving: show AuthModal if in Guest view or logged out
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    setIsScanning(true);
    setScanStep("reading");

    // Fast step animation sequence
    const timer1 = setTimeout(() => {
      setScanStep("solving");
    }, 300);

    try {
      let solution: MathSolution;
      try {
        const res = await fetch("/api/solve-math", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          solution = await res.json();
        } else {
          // Static host fallback (e.g. GitHub Pages)
          solution = generateFallbackSolution(payload.text || "2x + 5 = 15");
        }
      } catch {
        // Network or offline fallback (e.g. GitHub Pages)
        solution = generateFallbackSolution(payload.text || "2x + 5 = 15");
      }

      clearTimeout(timer1);
      setIsScanning(false);
      setScanStep("idle");

      if (solution.isReadable && solution.problemDetected && solution.finalAnswer) {
        setCurrentSolution(solution);
        playSuccessChime();
        setCurrentView("result");

        // Automatically record to scan history
        const newItem: ScanHistoryItem = {
          id: `scan-${Date.now()}`,
          timestamp: Date.now(),
          problemDetected: solution.problemDetected,
          topic: solution.topic || "Algebra",
          finalAnswer: solution.finalAnswer,
          solution: solution,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        };
        setHistory((prev) => [newItem, ...prev.slice(0, 49)]);

        // Sync scan record to cloud / Firebase
        syncScanToCloud(newItem, currentUser);
      } else {
        setErrorMessage(
          solution.errorMessage || "Couldn't read the problem clearly."
        );
        setCurrentView("unreadable");
      }
    } catch (err: any) {
      clearTimeout(timer1);
      setIsScanning(false);
      setScanStep("idle");
      setErrorMessage("Network or connection error while solving equation.");
      setCurrentView("unreadable");
    }
  };

  const handleSaveSolutionToHistory = (sol: MathSolution) => {
    setHistory((prev) => {
      const exists = prev.some(
        (item) => item.problemDetected === sol.problemDetected
      );
      if (exists) {
        return prev.filter(
          (item) => item.problemDetected !== sol.problemDetected
        );
      } else {
        const newItem: ScanHistoryItem = {
          id: `scan-${Date.now()}`,
          timestamp: Date.now(),
          problemDetected: sol.problemDetected,
          topic: sol.topic || "Algebra",
          finalAnswer: sol.finalAnswer,
          solution: sol,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        };
        syncScanToCloud(newItem, currentUser);
        return [newItem, ...prev];
      }
    });
  };

  const handleRemoveHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    setCurrentSolution(item.solution);
    setCurrentView("result");
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleOpenManualInput = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView("manual");
  };

  const handleOpenAdminManager = () => {
    if (currentUser?.role !== "admin") {
      alert("Access Denied: Admin Manager is restricted strictly to Administrator accounts.");
      return;
    }
    setShowAdminManagerModal(true);
  };

  return (
    <div className="w-full min-h-screen bg-[#05070B] text-white selection:bg-[#00F0FF]/30 selection:text-[#00F0FF]">
      {/* HOME CAMERA VIEW */}
      {currentView === "camera" && (
        <CameraView
          onScanImage={(base64, sampleText) =>
            handleSolveRequest({ image: base64, text: sampleText })
          }
          onOpenManualInput={handleOpenManualInput}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenAdminManager={handleOpenAdminManager}
          currentUser={currentUser}
          isScanning={isScanning}
          scanStep={scanStep}
        />
      )}

      {/* RESULT VIEW */}
      {currentView === "result" && currentSolution && (
        <ResultView
          solution={currentSolution}
          onBackToCamera={() => setCurrentView("camera")}
          onOpenManualInput={handleOpenManualInput}
          onSaveToHistory={handleSaveSolutionToHistory}
          isSaved={history.some(
            (h) => h.problemDetected === currentSolution.problemDetected
          )}
        />
      )}

      {/* MANUAL INPUT VIEW */}
      {currentView === "manual" && (
        <ManualInputView
          onSolveText={(mathText, topicHint) =>
            handleSolveRequest({ text: mathText, topicHint })
          }
          onBackToCamera={() => setCurrentView("camera")}
          isSolving={isScanning}
        />
      )}

      {/* UNREADABLE ERROR VIEW */}
      {currentView === "unreadable" && (
        <UnreadableErrorView
          onTryAgain={() => setCurrentView("camera")}
          onEnterManually={handleOpenManualInput}
          errorMessage={errorMessage}
        />
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <HistoryModal
          history={history}
          onSelectHistoryItem={handleSelectHistoryItem}
          onRemoveHistoryItem={handleRemoveHistoryItem}
          onClearHistory={handleClearHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          flashMode={flashMode}
          onToggleFlash={() => setFlashMode(!flashMode)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          explanationDepth={explanationDepth}
          onChangeExplanationDepth={setExplanationDepth}
          theme={theme}
          onChangeTheme={setTheme}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenAdminManager={handleOpenAdminManager}
        />
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        onUserChanged={setCurrentUser}
        onOpenAdminManager={handleOpenAdminManager}
      />

      {/* ADMIN MANAGER MODAL */}
      <AdminManagerModal
        isOpen={showAdminManagerModal}
        onClose={() => {
          setShowAdminManagerModal(false);
          if (window.location.hash === "#/admin" || window.location.hash === "#admin") {
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
          }
        }}
        currentUser={currentUser}
      />
    </div>
  );
}

