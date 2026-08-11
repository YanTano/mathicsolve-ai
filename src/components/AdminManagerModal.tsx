import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  SlidersHorizontal,
  Users,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Search,
  Key,
  ShieldAlert,
  ShieldCheck,
  Download,
  Upload,
  Check,
  Zap,
  Globe,
  Settings,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  Lock,
} from "lucide-react";
import { FirebaseConfig, UserProfile, ScanHistoryItem, CloudDocument } from "../types";
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  testFirebaseConnection,
  getMockUsers,
  fetchCloudUsers,
  fetchCloudScans,
  updateUserRole,
  updateUserStatus,
  deleteAdminUser,
  createAdminUser,
  updateAdminUserFull,
  fetchCollectionDocs,
  saveCollectionDoc,
  deleteCollectionDoc,
  DEFAULT_FIREBASE_CONFIG,
} from "../lib/firebase";

interface AdminManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

export const AdminManagerModal: React.FC<AdminManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<"config" | "users" | "database" | "scans" | "analytics">("config");

  // Firebase Config State
  const [config, setConfig] = useState<FirebaseConfig>(getStoredFirebaseConfig());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Database / Collections Inspector State
  const [selectedCollection, setSelectedCollection] = useState("users");
  const [customCollectionInput, setCustomCollectionInput] = useState("");
  const [collectionDocs, setCollectionDocs] = useState<CloudDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CloudDocument | null>(null);
  const [editingJsonText, setEditingJsonText] = useState("");
  const [newDocId, setNewDocId] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Scans State
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [scanSearch, setScanSearch] = useState("");
  const [selectedScanTopic, setSelectedScanTopic] = useState("all");
  const [loadingScans, setLoadingScans] = useState(false);

  // Password & Admin Creation / Editing State
  const [showPasswordsGlobal, setShowPasswordsGlobal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Create Admin Modal State
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'user' | 'pro'>("admin");
  const [createAdminError, setCreateAdminError] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRole, setEditUserRole] = useState<'admin' | 'user' | 'pro'>("user");
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'suspended'>("active");
  const [editUserError, setEditUserError] = useState<string | null>(null);

  // Delete Confirmation Modals State
  const [userToDelete, setUserToDelete] = useState<{ uid: string; name: string } | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ collection: string; docId: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredFirebaseConfig());
      loadDataForActiveTab();
    }
  }, [isOpen, activeTab, selectedCollection]);

  const loadDataForActiveTab = async () => {
    if (activeTab === "users") {
      setLoadingUsers(true);
      // Synchronously set local cached users first so UI displays instantly
      const cached = getMockUsers();
      if (cached && cached.length > 0) {
        setUsers(cached);
      }
      try {
        const res = await fetchCloudUsers();
        if (res && res.length > 0) {
          setUsers(res);
        }
      } catch (e) {
        console.warn("Failed to sync cloud users:", e);
      } finally {
        setLoadingUsers(false);
      }
    } else if (activeTab === "database") {
      setLoadingDocs(true);
      const docs = await fetchCollectionDocs(selectedCollection);
      setCollectionDocs(docs);
      setLoadingDocs(false);
    } else if (activeTab === "scans") {
      setLoadingScans(true);
      const res = await fetchCloudScans();
      setScans(res);
      setLoadingScans(false);
    } else if (activeTab === "analytics") {
      fetchCloudUsers().then((res) => res && res.length > 0 && setUsers(res));
      fetchCloudScans().then(setScans);
    }
  };

  if (!isOpen) return null;

  // Security Gate: Restrict Admin Manager ONLY to Admin users
  if (currentUser?.role !== "admin") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div className="p-6 bg-[#0b101b] border border-red-500/40 rounded-2xl max-w-md w-full text-center text-white space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-red-400">Access Denied</h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Admin Manager is strictly restricted to Administrator accounts. User and Pro accounts cannot open or manage this console.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition-all"
          >
            Close Manager
          </button>
        </div>
      </div>
    );
  }

  // Firebase Config Handlers
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setSaveSuccessMsg(null);
    const result = await testFirebaseConnection(config);
    setTestResult(result);
    setTestingConnection(false);
  };

  const handleSaveConfig = () => {
    saveStoredFirebaseConfig(config);
    setSaveSuccessMsg("Firebase credentials saved & applied! Real-time database is now active.");
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetConfig = () => {
    if (confirm("Reset to default preview configuration?")) {
      clearStoredFirebaseConfig();
      setConfig(DEFAULT_FIREBASE_CONFIG);
      setTestResult(null);
      setSaveSuccessMsg("Reset to default configuration.");
    }
  };

  // User Management Handlers
  const toggleUserPasswordVisibility = (uid: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleRoleChange = async (uid: string, role: 'admin' | 'user' | 'pro') => {
    await updateUserRole(uid, role);
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
  };

  const handleStatusChange = async (uid: string, status: 'active' | 'suspended') => {
    if (!uid) return;
    try {
      await updateUserStatus(uid, status);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
    } catch (e: any) {
      alert(e?.message || "Failed to update user status.");
    }
  };

  const handleDeleteUser = async (uid: string, nameOrEmail: string) => {
    if (!uid) return;
    if (uid === "admin_master_1") {
      alert("System Master Admin account cannot be deleted.");
      return;
    }
    setUserToDelete({ uid, name: nameOrEmail });
  };

  const closeCreateAdminModal = () => {
    setShowCreateAdminModal(false);
    setNewAdminEmail("");
    setNewAdminName("");
    setNewAdminPassword("");
    setNewAdminRole("admin");
    setCreateAdminError(null);
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminError(null);
    if (!newAdminEmail.trim()) {
      setCreateAdminError("Please enter an email address.");
      return;
    }
    try {
      await createAdminUser({
        email: newAdminEmail.trim(),
        displayName: newAdminName.trim() || undefined,
        password: newAdminPassword.trim() || "admin123",
        role: newAdminRole,
        status: "active",
      });
      closeCreateAdminModal();
      loadDataForActiveTab();
    } catch (err: any) {
      setCreateAdminError(err.message || "Failed to create admin user.");
    }
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditUserEmail(u.email);
    setEditUserName(u.displayName || "");
    setEditUserPassword(u.password || "admin123");
    setEditUserRole(u.role);
    setEditUserStatus(u.status || "active");
    setEditUserError(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError(null);
    try {
      await updateAdminUserFull(editingUser.uid, {
        email: editUserEmail.trim(),
        displayName: editUserName.trim() || editUserEmail.split("@")[0],
        password: editUserPassword.trim() || "admin123",
        role: editUserRole,
        status: editUserStatus,
      });
      setEditingUser(null);
      loadDataForActiveTab();
    } catch (err: any) {
      setEditUserError(err.message || "Failed to update user profile.");
    }
  };

  // Database / Firestore Editor Handlers
  const handleEditDocument = (docItem: CloudDocument) => {
    setEditingDoc(docItem);
    setEditingJsonText(JSON.stringify(docItem.data, null, 2));
    setNewDocId(docItem.id);
    setJsonError(null);
  };

  const handleCreateNewDoc = () => {
    const id = `doc_${Date.now()}`;
    const newDoc: CloudDocument = {
      id,
      collection: selectedCollection,
      data: {
        title: "New Item",
        createdAt: Date.now(),
      },
    };
    setEditingDoc(newDoc);
    setNewDocId(id);
    setEditingJsonText(JSON.stringify(newDoc.data, null, 2));
    setJsonError(null);
  };

  const handleSaveDocJson = async () => {
    if (!editingDoc || !newDocId.trim()) return;
    try {
      const parsedData = JSON.parse(editingJsonText);
      await saveCollectionDoc(selectedCollection, newDocId.trim(), parsedData);
      setEditingDoc(null);
      setEditingJsonText("");
      loadDataForActiveTab();
    } catch (e: any) {
      setJsonError("Invalid JSON structure: " + e.message);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setDocToDelete({ collection: selectedCollection, docId });
  };

  // Export Database
  const handleExportDatabase = () => {
    const exportData = {
      config,
      users,
      scans,
      exportedAt: new Date().toISOString(),
      appName: "MATHICSOLVE AI",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mathicsolve_db_export_${Date.now()}.json`;
    a.click();
  };

  const isCustomConfigActive = config.apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-[#0b101b] border border-[#00F0FF]/30 rounded-2xl shadow-[0_0_60px_rgba(0,240,255,0.15)] overflow-hidden text-white flex flex-col">
        {/* TOP ACCENT BAR */}
        <div className="h-1 bg-gradient-to-r from-[#00F0FF] via-[#FF007A] to-amber-400" />

        {/* HEADER */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-widest text-white uppercase">
                  MATHICSOLVE <span className="text-amber-400">ADMIN MANAGER</span>
                </h2>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isCustomConfigActive
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  }`}
                >
                  {isCustomConfigActive ? "Live Firebase Active" : "Built-in Firebase Engine"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Manage Firebase credentials, Firestore collections, users, and solution logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-5 py-2.5 border-b border-white/10 bg-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("config")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "config"
                ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Firebase Credentials</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "users"
                ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setActiveTab("database")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "database"
                ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firestore Editor</span>
          </button>

          <button
            onClick={() => setActiveTab("scans")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "scans"
                ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Solution Logs</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "analytics"
                ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>App Stats & Export</span>
          </button>
        </div>

        {/* MAIN TAB CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: FIREBASE CONFIG MANAGER */}
          {activeTab === "config" && (
            <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/30 flex items-start gap-3">
                <Globe className="w-5 h-5 text-[#00F0FF] shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 space-y-1">
                  <p className="font-semibold text-white">Connect Your Custom Firebase Console Project</p>
                  <p>
                    You can enter your own Firebase Web App configuration below to connect this app directly to your personal Firebase project's Auth and Firestore database!
                  </p>
                  <p className="text-[11px] text-gray-400 pt-1">
                    Find these keys in your Firebase Console → Project Settings → General → "Your apps" section.
                  </p>
                </div>
              </div>

              {/* FEEDBACK MESSAGES */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* FORM FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    API Key (<span className="text-[#00F0FF]">apiKey</span>)
                  </label>
                  <input
                    type="text"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Project ID (<span className="text-[#00F0FF]">projectId</span>)
                  </label>
                  <input
                    type="text"
                    value={config.projectId}
                    onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                    placeholder="my-math-app-123"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Auth Domain (<span className="text-[#00F0FF]">authDomain</span>)
                  </label>
                  <input
                    type="text"
                    value={config.authDomain}
                    onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                    placeholder="my-math-app.firebaseapp.com"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Storage Bucket (<span className="text-[#00F0FF]">storageBucket</span>)
                  </label>
                  <input
                    type="text"
                    value={config.storageBucket}
                    onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                    placeholder="my-math-app.appspot.com"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Messaging Sender ID
                  </label>
                  <input
                    type="text"
                    value={config.messagingSenderId}
                    onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    App ID (<span className="text-[#00F0FF]">appId</span>)
                  </label>
                  <input
                    type="text"
                    value={config.appId}
                    onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                    placeholder="1:1234567890:web:abcdef"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-medium transition-all flex items-center gap-2"
                  >
                    {testingConnection ? (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>Test Credentials</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-blue-600 text-slate-950 font-bold hover:brightness-110 text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Connect Firebase</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search registered users by name, email, or password..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateAdminModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Admin User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasswordsGlobal(!showPasswordsGlobal)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      showPasswordsGlobal
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-white/5 text-gray-300 border-white/10 hover:text-white"
                    }`}
                  >
                    {showPasswordsGlobal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPasswordsGlobal ? "Hide Passwords" : "See Passwords"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={loadDataForActiveTab}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin text-[#00F0FF]" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Admin Password</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Last Active</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const filteredUsers = users.filter(
                          (u) =>
                            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            (u.password && u.password.toLowerCase().includes(userSearch.toLowerCase()))
                        );

                        if (filteredUsers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Users className="w-8 h-8 text-gray-500" />
                                  <p className="text-xs font-semibold text-gray-300">
                                    {users.length === 0 ? "No registered users found." : "No matching users found."}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {users.length === 0
                                      ? "Click '+ Add Admin User' above to register a new account."
                                      : "Try adjusting your search criteria."}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filteredUsers.map((u, idx) => {
                          const isPassVisible = showPasswordsGlobal || visiblePasswords[u.uid];
                          return (
                            <tr key={`${u.uid}_${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] font-bold text-xs shrink-0">
                                    {u.displayName ? u.displayName[0].toUpperCase() : "U"}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white flex items-center gap-1.5">
                                      <span>{u.displayName || "Mathic User"}</span>
                                      {u.role === "admin" && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                          ADMIN
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                                  className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[11px] text-white focus:outline-none focus:border-[#00F0FF]"
                                >
                                  <option value="user" className="bg-slate-900">User</option>
                                  <option value="pro" className="bg-slate-900">Pro</option>
                                  <option value="admin" className="bg-slate-900">Admin</option>
                                </select>
                              </td>

                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs px-2 py-1 bg-white/5 border border-white/10 rounded text-amber-300 min-w-[90px]">
                                    {isPassVisible ? (u.password || "admin123") : "••••••••"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleUserPasswordVisibility(u.uid)}
                                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title={isPassVisible ? "Hide password" : "See password"}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>

                              <td className="p-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    u.status === "suspended"
                                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  }`}
                                >
                                  {u.status || "active"}
                                </span>
                              </td>

                              <td className="p-3 text-[11px] text-gray-400 font-mono">
                                {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Recently"}
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u)}
                                    className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-medium transition-all flex items-center gap-1"
                                    title="Edit user details & password"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(
                                        u.uid,
                                        u.status === "suspended" ? "active" : "suspended"
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                                      u.status === "suspended"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                    }`}
                                    title={u.status === "suspended" ? "Re-activate account" : "Suspend user account"}
                                  >
                                    {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                                  </button>

                                  {u.uid !== "admin_master_1" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.uid, u.displayName || u.email)}
                                      className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium transition-colors flex items-center gap-1"
                                      title="Delete user account"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CREATE ADMIN USER MODAL */}
              {showCreateAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-[#0b101b] border border-amber-500/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">Add New Admin / User</h3>
                      </div>
                      <button
                        onClick={closeCreateAdminModal}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {createAdminError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{createAdminError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateAdminSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="newadmin@mathicsolve.ai"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          placeholder="Admin Sarah"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Account Password * (Admin viewable)
                        </label>
                        <div className="relative">
                          <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="e.g. adminPass123"
                            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-amber-300 font-mono placeholder-gray-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Role Assignment
                        </label>
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="admin">Admin (Full System Access)</option>
                          <option value="pro">Pro (Pro Solvers)</option>
                          <option value="user">User (Standard Student)</option>
                        </select>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeCreateAdminModal}
                          className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs font-medium hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold hover:brightness-110"
                        >
                          Create Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* EDIT USER DETAILS MODAL */}
              {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-[#0b101b] border border-[#00F0FF]/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-[#00F0FF]" />
                        <h3 className="text-sm font-bold text-white">Edit User Credentials & Details</h3>
                      </div>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {editUserError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{editUserError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveEditUser} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={editUserEmail}
                          onChange={(e) => setEditUserEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-300 mb-1">
                          Password (View & Edit Credentials)
                        </label>
                        <div className="relative">
                          <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={editUserPassword}
                            onChange={(e) => setEditUserPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">
                            Role
                          </label>
                          <select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                          >
                            <option value="admin">Admin</option>
                            <option value="pro">Pro</option>
                            <option value="user">User</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">
                            Status
                          </label>
                          <select
                            value={editUserStatus}
                            onChange={(e) => setEditUserStatus(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2">
                        {editingUser.uid !== "admin_master_1" ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(editingUser.uid, editingUser.displayName || editingUser.email)}
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Account</span>
                          </button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs font-medium hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-[#00F0FF] text-slate-950 text-xs font-bold hover:brightness-110"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* DELETE USER CONFIRMATION MODAL */}
              {userToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
                  <div className="bg-[#0b101b] border border-red-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.25)] text-white">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Delete User Account</h3>
                        <p className="text-xs text-gray-400">Confirm permanent account removal</p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                      Are you sure you want to permanently delete user account{" "}
                      <span className="font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {userToDelete.name}
                      </span>
                      ?
                    </p>

                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium">
                      ⚠️ Warning: This will permanently remove the user from MATHICSOLVE AI.
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setUserToDelete(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { uid } = userToDelete;
                          setUserToDelete(null);
                          try {
                            await deleteAdminUser(uid);
                            setUsers((prev) => prev.filter((u) => u.uid !== uid));
                            if (editingUser?.uid === uid) {
                              setEditingUser(null);
                            }
                          } catch (e: any) {
                            alert(e?.message || "Failed to delete user account.");
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 border border-red-400 transition-colors shadow-lg shadow-red-600/30 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DELETE DOCUMENT CONFIRMATION MODAL */}
              {docToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
                  <div className="bg-[#0b101b] border border-red-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.25)] text-white">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Delete Document</h3>
                        <p className="text-xs text-gray-400">Confirm database record deletion</p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                      Delete document{" "}
                      <span className="font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {docToDelete.docId}
                      </span>{" "}
                      from collection{" "}
                      <span className="font-bold text-[#00F0FF] bg-[#00F0FF]/10 px-1.5 py-0.5 rounded border border-[#00F0FF]/20">
                        {docToDelete.collection}
                      </span>
                      ?
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDocToDelete(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { collection, docId } = docToDelete;
                          setDocToDelete(null);
                          await deleteCollectionDoc(collection, docId);
                          loadDataForActiveTab();
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 border border-red-400 transition-colors shadow-lg shadow-red-600/30 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIRESTORE DOCUMENT EDITOR */}
          {activeTab === "database" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Collection:</span>
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="users" className="bg-slate-900">users</option>
                    <option value="scan_history" className="bg-slate-900">scan_history</option>
                    <option value="app_settings" className="bg-slate-900">app_settings</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Custom Collection..."
                      value={customCollectionInput}
                      onChange={(e) => setCustomCollectionInput(e.target.value)}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 w-36"
                    />
                    {customCollectionInput && (
                      <button
                        onClick={() => {
                          setSelectedCollection(customCollectionInput.trim());
                          setCustomCollectionInput("");
                        }}
                        className="px-2 py-1 bg-[#00F0FF]/20 text-[#00F0FF] rounded-xl text-xs font-bold"
                      >
                        Set
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateNewDoc}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Document</span>
                  </button>

                  <button
                    onClick={loadDataForActiveTab}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingDocs ? "animate-spin text-[#00F0FF]" : ""}`} />
                  </button>
                </div>
              </div>

              {/* EDITOR MODAL / PANEL IF EDITING */}
              {editingDoc && (
                <div className="p-4 rounded-xl bg-slate-900 border border-[#00F0FF]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#00F0FF]" />
                      <span className="text-xs font-bold text-white">
                        Document Editor ({selectedCollection})
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingDoc(null)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Document ID</label>
                    <input
                      type="text"
                      value={newDocId}
                      onChange={(e) => setNewDocId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Data (JSON Format)</label>
                    <textarea
                      rows={8}
                      value={editingJsonText}
                      onChange={(e) => {
                        setEditingJsonText(e.target.value);
                        setJsonError(null);
                      }}
                      className="w-full p-3 bg-black/60 border border-white/10 rounded-lg text-xs font-mono text-[#00F0FF] focus:outline-none focus:border-[#00F0FF]"
                    />
                    {jsonError && <p className="text-[11px] text-red-400 mt-1">{jsonError}</p>}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingDoc(null)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDocJson}
                      className="px-4 py-1.5 rounded-lg bg-[#00F0FF] text-slate-950 font-bold text-xs"
                    >
                      Save Document
                    </button>
                  </div>
                </div>
              )}

              {/* DOCUMENTS LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {collectionDocs.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#00F0FF] truncate">
                        ID: {docItem.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditDocument(docItem)}
                          className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(docItem.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className="text-[10px] font-mono text-gray-300 bg-black/40 p-2.5 rounded-lg overflow-x-auto max-h-36">
                      {JSON.stringify(docItem.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SOLUTION LOGS */}
          {activeTab === "scans" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search math equations, problems or answers..."
                    value={scanSearch}
                    onChange={(e) => setScanSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <button
                  onClick={loadDataForActiveTab}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingScans ? "animate-spin text-[#00F0FF]" : ""}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scans
                  .filter(
                    (s) =>
                      s.problemDetected?.toLowerCase().includes(scanSearch.toLowerCase()) ||
                      s.finalAnswer?.toLowerCase().includes(scanSearch.toLowerCase()) ||
                      s.topic?.toLowerCase().includes(scanSearch.toLowerCase())
                  )
                  .map((scan) => (
                    <div
                      key={scan.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
                          {scan.topic || "Algebra"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(scan.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="font-semibold text-white font-mono bg-black/40 p-2 rounded-lg">
                        {scan.problemDetected}
                      </div>

                      <div className="text-[#00F0FF] font-bold">
                        Answer: <span className="text-white">{scan.finalAnswer}</span>
                      </div>

                      <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1">
                        <span>User: {scan.userEmail || "Guest"}</span>
                        <span>Steps: {scan.solution?.steps?.length || 0}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS & EXPORT */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 space-y-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Total Cloud Users
                  </span>
                  <div className="text-3xl font-extrabold text-[#00F0FF]">{users.length}</div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-black border border-amber-500/30 space-y-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Total Scanned Problems
                  </span>
                  <div className="text-3xl font-extrabold text-amber-400">{scans.length}</div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/30 space-y-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Firebase Mode
                  </span>
                  <div className="text-lg font-bold text-emerald-300 truncate">
                    {isCustomConfigActive ? "Live Custom Firebase" : "Built-in Preview Engine"}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#00F0FF]" />
                  <span>Export Database Backup</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Export all users, math solution logs, and configuration state into a clean JSON backup file.
                </p>
                <button
                  onClick={handleExportDatabase}
                  className="px-4 py-2.5 rounded-xl bg-[#00F0FF] text-slate-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-2 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Database (.json)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
