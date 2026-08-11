import React, { useRef, useState, useEffect } from "react";
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Keyboard,
  Settings,
  History,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileQuestion,
  User,
  Shield,
  Database,
} from "lucide-react";
import { SAMPLE_PROBLEMS } from "../data/sampleProblems";
import { SampleProblem, UserProfile } from "../types";
import { optimizeImageDataUrl } from "../utils/imageCompressor";

interface CameraViewProps {
  onScanImage: (base64Image: string, problemText?: string) => void;
  onOpenManualInput: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenAuth?: () => void;
  onOpenAdminManager?: () => void;
  currentUser?: UserProfile | null;
  isScanning: boolean;
  scanStep: "reading" | "solving" | "idle";
}

export const CameraView: React.FC<CameraViewProps> = ({
  onScanImage,
  onOpenManualInput,
  onOpenSettings,
  onOpenHistory,
  onOpenAuth,
  onOpenAdminManager,
  currentUser,
  isScanning,
  scanStep,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [problemDetected, setProblemDetected] = useState<boolean>(false);
  const [isAutoFocusing, setIsAutoFocusing] = useState<boolean>(false);
  const [selectedSample, setSelectedSample] = useState<SampleProblem | null>(null);
  const [showSamplesMenu, setShowSamplesMenu] = useState<boolean>(false);

  // Initialize and enable camera stream with automatic fallback constraints
  const enableCameraStream = async () => {
    setIsRequestingCamera(true);
    setCameraError(null);

    // Stop existing stream tracks
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraAccess(false);
      setCameraError("Camera API is not supported in this browser environment.");
      setIsRequestingCamera(false);
      return;
    }

    let stream: MediaStream | null = null;
    try {
      // 1. Primary request with ideal resolution and facingMode
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (primaryErr: any) {
      console.warn("Primary camera request failed, attempting basic fallback constraint:", primaryErr);
      try {
        // 2. Fallback request with basic video boolean constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (fallbackErr: any) {
        console.warn("Fallback camera request failed:", fallbackErr);
        const errName = fallbackErr?.name || primaryErr?.name;
        let msg = "Camera permission denied or camera unavailable.";
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          msg = "Camera access was denied. Please check your browser permissions.";
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          msg = "No camera device found on this system.";
        } else if (errName === "NotReadableError" || errName === "TrackStartError") {
          msg = "Camera is currently in use by another application.";
        }
        setHasCameraAccess(false);
        setCameraError(msg);
        setIsRequestingCamera(false);
        return;
      }
    }

    if (stream) {
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video playback start warning:", playErr);
        }
      }
      setHasCameraAccess(true);
      setCameraError(null);
    }
    setIsRequestingCamera(false);
  };

  useEffect(() => {
    enableCameraStream();

    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
    };
  }, [facingMode]);

  // Handle Scan click
  const handleTriggerScan = async () => {
    // Trigger brief autofocus visual feedback
    setIsAutoFocusing(true);
    setTimeout(() => {
      setIsAutoFocusing(false);
    }, 350);

    if (selectedSample) {
      // If a sample problem was picked
      const dummyCanvas = document.createElement("canvas");
      dummyCanvas.width = 600;
      dummyCanvas.height = 300;
      const ctx = dummyCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0B0F17";
        ctx.fillRect(0, 0, 600, 300);
        ctx.fillStyle = "#00F0FF";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(selectedSample.expression, 300, 160);
      }
      onScanImage(dummyCanvas.toDataURL("image/jpeg", 0.85), selectedSample.expression);
      return;
    }

    if (videoRef.current && hasCameraAccess) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      
      // Scale down large video feeds (e.g. 1080p/4K) to max 1024px to keep payload tiny and ultra-fast
      const maxDim = 1024;
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        onScanImage(base64);
        return;
      }
    }

    // Fallback if camera stream not active: generate clean image canvas with default problem
    const fallbackCanvas = document.createElement("canvas");
    fallbackCanvas.width = 600;
    fallbackCanvas.height = 300;
    const ctx = fallbackCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#05070B";
      ctx.fillRect(0, 0, 600, 300);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText("2x + 5 = 15", 300, 160);
    }
    onScanImage(fallbackCanvas.toDataURL("image/jpeg", 0.85), "2x + 5 = 15");
  };

  const handleUploadClick = () => {
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    fileInputRef.current?.click();
  };

  // Gallery Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const result = evt.target?.result as string;
        if (result) {
          const optimized = await optimizeImageDataUrl(result);
          onScanImage(optimized);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleToggleFlash = () => {
    setFlashOn((prev) => !prev);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#05070B] text-white flex flex-col justify-between overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP HEADER */}
      <header className="relative z-20 pt-4 px-5 pb-2 flex items-center justify-between backdrop-blur-md bg-[#05070B]/80 border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.2em] text-[#00F0FF] font-bold">MATHICSOLVE AI</span>
          <span className="text-[8px] tracking-[0.1em] text-white/40 uppercase">AI Math Scanner & Solver</span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === "admin" && onOpenAdminManager && (
            <button
              onClick={onOpenAdminManager}
              className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center shadow-md"
              title="Built-in Admin Manager"
            >
              <Database className="w-4 h-4" />
            </button>
          )}

          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className={`w-8 h-8 rounded-full border transition flex items-center justify-center ${
                currentUser
                  ? "bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]"
                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-[#00F0FF]/40"
              }`}
              title={currentUser ? `Account: ${currentUser.email}` : "Sign In / Register"}
            >
              <User className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenHistory}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-[#00F0FF]/40 transition flex items-center justify-center"
            title="Scan History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-[#00F0FF]/40 transition flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* SAMPLE PROBLEMS DRAWER TOGGLE / SELECTOR */}
      <div className="relative z-20 px-5 pt-1">
        <div className="flex items-center justify-between bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <Sparkles className="w-4 h-4 text-[#00F0FF]" />
            <span>Sample equations:</span>
          </div>
          <button
            onClick={() => setShowSamplesMenu(!showSamplesMenu)}
            className="text-[#00F0FF] hover:underline font-medium"
          >
            {showSamplesMenu ? "Close" : "Choose Sample →"}
          </button>
        </div>

        {showSamplesMenu && (
          <div className="mt-2 p-3 glass-card bg-slate-900/90 border-slate-700/60 rounded-xl grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {SAMPLE_PROBLEMS.map((sample) => {
              const isSelected = selectedSample?.id === sample.id;
              return (
                <button
                  key={sample.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSample(null);
                      setProblemDetected(false);
                    } else {
                      setSelectedSample(sample);
                      setProblemDetected(true);
                    }
                    setShowSamplesMenu(false);
                  }}
                  className={`p-2.5 text-left rounded-lg border transition ${
                    isSelected
                      ? "bg-[#00F0FF]/20 border-[#00F0FF] text-white"
                      : "bg-slate-800/60 border-white/5 text-gray-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="text-[10px] text-[#00F0FF] uppercase tracking-wider font-semibold">
                    {sample.topic}
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">
                    {sample.expression}
                  </div>
                </button>
              );
            })}
            {selectedSample && (
              <button
                onClick={() => {
                  setSelectedSample(null);
                  setProblemDetected(false);
                }}
                className="col-span-2 text-center text-xs text-red-400 hover:underline py-1"
              >
                Clear selected sample (Use Live Camera)
              </button>
            )}
          </div>
        )}
      </div>

      {/* CAMERA VIEWPORT HERO */}
      <main className="relative flex-1 my-3 px-4 w-full max-w-xl mx-auto flex items-center justify-center">
        <div className="relative w-full h-[60vh] max-h-[580px] rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-black flex items-center justify-center">
          {/* Real Live Device Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition duration-300 ${
              flashOn ? "brightness-125" : ""
            } ${hasCameraAccess ? "opacity-100" : "opacity-20"}`}
          />

          {/* Camera Permission / Request Overlay if camera is off or pending */}
          {!hasCameraAccess && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md text-center max-w-sm mx-auto my-auto rounded-2xl border border-white/10 shadow-2xl">
              <div className="p-3.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] mb-3 border border-[#00F0FF]/30">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white mb-1">
                Device Camera
              </p>
              <p className="text-xs text-gray-300 mb-4 px-2 leading-relaxed">
                {cameraError || "Grant camera permission to scan math problems live from your screen or paper."}
              </p>
              <div className="flex flex-col items-center gap-2.5 w-full">
                <button
                  type="button"
                  disabled={isRequestingCamera}
                  onClick={enableCameraStream}
                  className="w-full py-2.5 px-5 rounded-full bg-[#00F0FF] text-[#05070B] font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:bg-[#00F0FF]/90 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRequestingCamera ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#05070B] border-t-transparent rounded-full animate-spin" />
                      <span>Requesting Camera...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Enable Camera</span>
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-gray-400">
                  <button
                    type="button"
                    onClick={() => setShowSamplesMenu(true)}
                    className="hover:text-[#00F0FF] underline transition-colors"
                  >
                    Use Sample Math
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="hover:text-[#00F0FF] underline transition-colors"
                  >
                    Upload Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCANNING FRAME OVERLAY */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-20">
            <div
              className={`relative w-[85%] h-[40%] min-h-[160px] max-h-[220px] rounded-2xl transition-all duration-300 flex flex-col items-center justify-center overflow-hidden ${
                isAutoFocusing
                  ? "border-2 border-white bg-white/20 shadow-[0_0_40px_rgba(255,255,255,0.95)] scale-[0.98] animate-pulse"
                  : problemDetected && !isScanning
                  ? "border-2 border-[#00F0FF] animate-auto-highlight bg-[#00F0FF]/10 scale-[1.01]"
                  : isScanning
                  ? "border-2 border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.4)] bg-[#00F0FF]/5"
                  : "border-2 border-white/30 bg-black/10"
              }`}
            >
              {/* Simulated Auto-Focus Reticle Feedback */}
              {isAutoFocusing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <div className="w-16 h-16 border-2 border-white/90 rounded-xl animate-ping opacity-80" />
                  <span className="absolute text-[9px] font-mono font-bold tracking-widest text-[#05070B] bg-white px-2 py-0.5 rounded shadow-[0_0_12px_rgba(255,255,255,0.9)] uppercase">
                    AF LOCK
                  </span>
                </div>
              )}

              {/* AUTO-HIGHLIGHT BOUNDING BOX AROUND DETECTED EQUATION (Before Scanning) */}
              {problemDetected && !isScanning && !isAutoFocusing && (
                <div className="relative z-10 p-3 rounded-xl border border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_20px_rgba(0,240,255,0.35)] backdrop-blur-sm animate-pulse flex flex-col items-center justify-center gap-1 my-auto">
                  {/* Small Target Corner Brackets inside highlight */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#00F0FF]" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#00F0FF]" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#00F0FF]" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#00F0FF]" />

                  {/* Math text expression display if selected sample is set */}
                  {selectedSample && (
                    <span className="text-xl md:text-2xl font-mono font-bold tracking-wider text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                      {selectedSample.expression}
                    </span>
                  )}
                </div>
              )}

              {/* Show selected sample expression if problem is not yet auto-detected */}
              {selectedSample && !problemDetected && !isAutoFocusing && (
                <span className="text-2xl md:text-3xl font-mono font-medium tracking-tight text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] z-10 px-4 text-center">
                  {selectedSample.expression}
                </span>
              )}

              {/* Cyan Horizontal Scanning Laser Beam Line (Always Moving Up & Down) */}
              <div
                className={`absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent shadow-[0_0_25px_#00F0FF,0_0_12px_#00F0FF] animate-scan-beam pointer-events-none z-30 ${
                  isScanning ? "opacity-100 scale-y-125" : "opacity-90"
                }`}
              >
                <div className="absolute inset-x-0 -top-2.5 h-6 bg-[#00F0FF]/30 blur-md pointer-events-none" />
              </div>
            </div>
          </div>

          {/* SCANNING STATE OVERLAY */}
          {isScanning && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-in fade-in duration-200">
              <div className="p-6 rounded-3xl glass-card-cyan text-center max-w-xs mx-auto space-y-3">
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#00F0FF] border-r-transparent border-b-[#00F0FF] border-l-transparent animate-spin" />
                  <Sparkles className="w-6 h-6 text-[#00F0FF] animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                    {scanStep === "reading" ? "Reading problem..." : "Solving..."}
                  </h3>
                  <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                    MATHICSOLVE AI Engine
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM CONTROLS SECTION */}
      <footer className="relative z-20 pb-6 pt-3 px-6 flex flex-col items-center justify-center gap-4 bg-[#05070B] border-t border-white/5">
        <span className="text-[10px] text-white/40 font-medium tracking-wide">
          Point your camera at a math problem
        </span>

        {/* HERO SCAN BUTTON + SECONDARIES */}
        <div className="w-full max-w-sm flex items-center justify-between px-6">
          {/* Left Controls: Flip Camera / Torch */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleFlipCamera}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#00F0FF]/40 active:scale-95 transition flex items-center justify-center"
              title="Flip Camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleFlash}
              className={`w-9 h-9 rounded-full border transition active:scale-95 flex items-center justify-center ${
                flashOn
                  ? "bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              }`}
              title="Toggle Flash"
            >
              {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          </div>

          {/* MAIN GIANT SCAN BUTTON */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleTriggerScan}
              disabled={isScanning}
              className="w-16 h-16 rounded-full border-2 border-[#00F0FF] p-1 shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95 transition-transform duration-150 disabled:opacity-50"
              title="Scan Problem"
            >
              <div className="w-full h-full rounded-full bg-[#00F0FF] flex items-center justify-center font-black text-[10px] text-[#05070B] tracking-widest uppercase">
                SCAN
              </div>
            </button>
          </div>

          {/* Right Controls: Gallery / Manual Input */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUploadClick}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#00F0FF]/40 active:scale-95 transition flex items-center justify-center"
              title="Upload Image from Gallery"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={onOpenManualInput}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#00F0FF]/40 active:scale-95 transition flex items-center justify-center"
              title="Enter Problem Manually"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
