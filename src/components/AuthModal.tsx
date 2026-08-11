import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User,
  Shield,
  CheckCircle,
  LogIn,
  UserPlus,
  LogOut,
  AlertCircle,
  Sparkles,
  Key,
  Globe,
  Database,
  SlidersHorizontal,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { UserProfile } from "../types";
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
  sendPasswordReset,
  formatFirebaseAuthError,
} from "../lib/firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChanged: (user: UserProfile | null) => void;
  onOpenAdminManager: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onOpenAdminManager,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (activeTab === "reset") {
        if (!email) {
          throw new Error("Please enter your account email address.");
        }
        const msg = await sendPasswordReset(email);
        setSuccessMsg(msg);
      } else if (activeTab === "login") {
        if (!email || !password) {
          throw new Error("Please enter both email and password.");
        }
        const user = await loginWithEmail(email, password);
        onUserChanged(user);
        setSuccessMsg(`Welcome back, ${user.displayName || user.email}!`);
        setEmail("");
        setPassword("");
        setDisplayName("");
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        if (!email || !password) {
          throw new Error("Please fill in all required fields.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        const user = await registerWithEmail(email, password, displayName);
        onUserChanged(user);
        setSuccessMsg(`Account created successfully! Welcome to MATHICSOLVE AI.`);
        setEmail("");
        setPassword("");
        setDisplayName("");
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onUserChanged(user);
      setSuccessMsg(`Signed in with Google as ${user.email}`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onUserChanged(null);
      setSuccessMsg("Logged out successfully.");
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0b101b] border border-[#00F0FF]/30 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden text-white flex flex-col">
        {/* TOP ACCENT LINE */}
        <div className="h-1 bg-gradient-to-r from-[#00F0FF] via-indigo-500 to-[#FF007A]" />

        {/* HEADER */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs tracking-[0.2em] text-[#00F0FF] font-bold">MATHICSOLVE AI</span>
              <span className="text-[10px] text-white/50">User Account</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {currentUser ? (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00F0FF] to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white truncate">
                    {currentUser.displayName || "Mathic User"}
                  </h3>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border ${
                      currentUser.role === "admin"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : currentUser.role === "pro"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40"
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="space-y-3">
              {currentUser.role === "admin" && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAdminManager();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/40 text-amber-300 font-medium hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-lg group text-xs"
                  >
                    <Database className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Open Built-in Admin Manager</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenAdminManager();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00F0FF]/30 text-xs text-gray-300 hover:text-white transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>Manage Firebase Project Credentials</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Configure</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-medium transition-all flex items-center justify-center gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* LOGIN / REGISTER / RESET TABS VIEW */
          <div className="p-6 space-y-5">
            {/* TAB SELECTOR */}
            {activeTab === "reset" ? (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#00F0FF]" />
                  <span className="text-xs font-bold text-white">Reset Password</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            ) : (
              <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "login"
                      ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "register"
                      ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            )}

            {/* MESSAGES */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {activeTab === "reset" && (
                <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                  Enter your registered account email below. We'll send you an instant link/instructions to safely reset your password.
                </p>
              )}

              {activeTab === "register" && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-300 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivers"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF] transition-colors"
                  />
                </div>
              </div>

              {activeTab !== "reset" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-gray-300">
                      Password
                    </label>
                    {activeTab === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("reset");
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[10px] font-semibold text-[#00F0FF] hover:underline transition-all"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF] transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00F0FF] to-blue-600 text-slate-950 font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)] text-xs uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : activeTab === "reset" ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Reset Instructions</span>
                  </>
                ) : activeTab === "login" ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* GOOGLE SIGN IN */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                <span className="bg-[#0b101b] px-2 text-gray-400">or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 text-xs text-white font-medium transition-all flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
