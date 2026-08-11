import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  Firestore,
} from "firebase/firestore";
import { FirebaseConfig, UserProfile, ScanHistoryItem, CloudDocument } from "../types";

const LOCAL_STORAGE_CONFIG_KEY = "mathicsolve_firebase_config";
const LOCAL_STORAGE_MOCK_USERS_KEY = "mathicsolve_cloud_users";
const LOCAL_STORAGE_MOCK_SCANS_KEY = "mathicsolve_cloud_scans";

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAbtVbzvRJ9qM96CRCDlc3FRTkOIMneZlY",
  authDomain: "mathicsolve-ai.firebaseapp.com",
  projectId: "mathicsolve-ai",
  storageBucket: "mathicsolve-ai.firebasestorage.app",
  messagingSenderId: "41499663866",
  appId: "1:41499663866:web:c76ae2f322991b29801843",
  measurementId: "G-CEHWZNTPRE",
};

export function getStoredFirebaseConfig(): FirebaseConfig {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Failed to load custom firebase config:", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
    // Re-initialize app with new config
    initFirebaseService(config);
  } catch (e) {
    console.error("Failed to save firebase config:", e);
  }
}

export function clearStoredFirebaseConfig(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_CONFIG_KEY);
    initFirebaseService(DEFAULT_FIREBASE_CONFIG);
  } catch (e) {
    console.error("Failed to reset firebase config:", e);
  }
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

export function initFirebaseService(customConfig?: FirebaseConfig) {
  const config = customConfig || getStoredFirebaseConfig();
  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      // Re-use or initialize primary
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = initializeApp(config);
    }
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
  } catch (err) {
    console.warn("Firebase initialization notice:", err);
  }
}

// Initial auto-boot
initFirebaseService();

export function getFirebaseAuth(): Auth | null {
  if (!firebaseAuth) initFirebaseService();
  return firebaseAuth;
}

export function getFirebaseFirestore(): Firestore | null {
  if (!firestoreDb) initFirebaseService();
  return firestoreDb;
}

// Test Firebase Credentials Connection
export async function testFirebaseConnection(config: FirebaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const tempAppName = `test-app-${Date.now()}`;
    const testApp = initializeApp(config, tempAppName);
    const testAuth = getAuth(testApp);
    if (!testAuth) {
      return { success: false, message: "Could not initialize Auth with provided configuration." };
    }
    return { success: true, message: `Successfully connected to project "${config.projectId}"!` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Invalid Firebase credentials." };
  }
}

// Auth Helper Functions
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      return await syncUserProfile(cred.user);
    } catch (e: any) {
      console.warn("Firebase Auth login attempt:", e);
      if (e.code === "auth/unauthorized-domain") {
        throw new Error("Domain Unauthorized: Please add 'yantano.github.io' to Firebase Console -> Authentication -> Settings -> Authorized Domains.");
      }
      if (e.code === "auth/operation-not-allowed") {
        throw new Error("Provider Disabled: Please enable Email/Password in Firebase Console -> Authentication -> Sign-in method.");
      }

      // Check local mock users if user exists locally
      const mockUsers = getMockUsers();
      const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      
      if (existing) {
        if (existing.status === "suspended") {
          throw new Error("This user account has been suspended by the administrator.");
        }
        existing.lastLogin = Date.now();
        saveMockUsers(mockUsers);
        return existing;
      }

      // If logging in with an email containing "admin" or carlomtano@gmail.com, auto-provision as admin
      if (email.toLowerCase().includes("admin") || email.toLowerCase() === "carlomtano@gmail.com") {
        const newUser: UserProfile = {
          uid: `user_${Date.now()}`,
          email,
          displayName: email.split("@")[0] || "Admin",
          role: "admin",
          password: pass,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          scanCount: 0,
          status: "active",
        };
        mockUsers.push(newUser);
        saveMockUsers(mockUsers);
        return newUser;
      }

      throw new Error(e.message || "Failed to log in with Firebase Auth");
    }
  }

  // Demo / Local Auth simulation if auth unavailable
  const mockUsers = getMockUsers();
  const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  
  if (existing) {
    if (existing.status === "suspended") {
      throw new Error("This user account has been suspended by the administrator.");
    }
    existing.lastLogin = Date.now();
    saveMockUsers(mockUsers);
    return existing;
  }

  // Create user automatically in demo mode
  const isFirstUserAdmin = mockUsers.length === 0 || email.toLowerCase().includes("admin") || email.toLowerCase() === "carlomtano@gmail.com";
  const newUser: UserProfile = {
    uid: `user_${Date.now()}`,
    email,
    displayName: email.split("@")[0] || "User",
    role: isFirstUserAdmin ? "admin" : "user",
    password: pass,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    scanCount: 0,
    status: "active",
  };
  mockUsers.push(newUser);
  saveMockUsers(mockUsers);
  return newUser;
}

export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      return await syncUserProfile({ ...cred.user, displayName });
    } catch (e: any) {
      console.warn("Firebase Auth register attempt:", e);
      const mockUsers = getMockUsers();
      const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        throw new Error("An account with this email address already exists.");
      }

      const isFirstUserAdmin = mockUsers.length === 0 || email.toLowerCase().includes("admin") || email.toLowerCase() === "carlomtano@gmail.com";
      const newUser: UserProfile = {
        uid: `user_${Date.now()}`,
        email,
        displayName: displayName || email.split("@")[0] || "User",
        role: isFirstUserAdmin ? "admin" : "user",
        password: pass,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        scanCount: 0,
        status: "active",
      };
      mockUsers.push(newUser);
      saveMockUsers(mockUsers);
      return newUser;
    }
  }

  const mockUsers = getMockUsers();
  const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error("An account with this email address already exists.");
  }

  const isFirstUserAdmin = mockUsers.length === 0 || email.toLowerCase().includes("admin") || email.toLowerCase() === "carlomtano@gmail.com";
  const newUser: UserProfile = {
    uid: `user_${Date.now()}`,
    email,
    displayName: displayName || email.split("@")[0] || "User",
    role: isFirstUserAdmin ? "admin" : "user",
    password: pass,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    scanCount: 0,
    status: "active",
  };
  mockUsers.push(newUser);
  saveMockUsers(mockUsers);
  return newUser;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  if (auth && auth.app.options.apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      return await syncUserProfile(cred.user);
    } catch (e: any) {
      console.warn("Google OAuth Popup issue:", e);
      if (e.code === "auth/popup-closed-by-user") {
        throw new Error("Google Sign-In window was closed before completing.");
      }
      if (e.code === "auth/popup-blocked") {
        throw new Error("Google Sign-In window was blocked by browser pop-up blocker.");
      }
      if (e.code === "auth/unauthorized-domain") {
        throw new Error("Domain Unauthorized: Please add 'yantano.github.io' to Firebase Console -> Authentication -> Settings -> Authorized Domains.");
      }
      if (e.code === "auth/operation-not-allowed") {
        throw new Error("Google Provider Disabled: Please enable Google in Firebase Console -> Authentication -> Sign-in method.");
      }
      // If error is invalid API key, fallback to local demo mode
      if (e.code !== "auth/invalid-api-key" && e.code !== "auth/api-key-not-valid") {
        throw new Error(e.message || "Google Sign-In failed.");
      }
    }
  }

  // Fallback Google account mock login for demo environment or default key
  const mockUsers = getMockUsers();
  const demoEmail = "google.user@mathicsolve.ai";
  let existing = mockUsers.find((u) => u.email === demoEmail);

  if (!existing) {
    existing = {
      uid: `google_user_${Date.now()}`,
      email: demoEmail,
      displayName: "Google User",
      role: mockUsers.length === 0 ? "admin" : "user",
      photoURL: "https://lh3.googleusercontent.com/a/default-user",
      createdAt: Date.now(),
      lastLogin: Date.now(),
      scanCount: 0,
      status: "active",
    };
    mockUsers.push(existing);
  } else {
    existing.lastLogin = Date.now();
  }
  saveMockUsers(mockUsers);
  return existing;
}

export async function logoutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Signout warning:", e);
    }
  }
}

export async function sendPasswordReset(email: string): Promise<string> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Please enter a valid email address.");
  }

  const auth = getFirebaseAuth();
  if (auth && auth.app.options.apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return `Password reset email sent to ${trimmedEmail}! Please check your inbox and spam folder.`;
    } catch (e: any) {
      throw new Error(e?.message || "Failed to send password reset email via Firebase Auth.");
    }
  }

  // Demo fallback mode
  const mockUsers = getMockUsers();
  const existing = mockUsers.find((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase());

  if (existing) {
    return `Password reset instructions sent to ${trimmedEmail}! (Demo Mode: Click your reset link or log in using your credentials).`;
  }

  return `Password reset email sent to ${trimmedEmail} if an account exists under that address.`;
}

export async function syncUserProfile(user: any): Promise<UserProfile> {
  const db = getFirebaseFirestore();
  const userRef = db ? doc(db, "users", user.uid) : null;
  
  let role: "admin" | "user" | "pro" = "user";
  if (user.email && (user.email.includes("admin") || user.email === "carlomtano@gmail.com")) {
    role = "admin";
  }

  const profileData: UserProfile = {
    uid: user.uid,
    email: user.email || "user@mathicsolve.ai",
    displayName: user.displayName || user.email?.split("@")[0] || "Mathic User",
    photoURL: user.photoURL || undefined,
    role,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    scanCount: 0,
    status: "active",
  };

  if (userRef) {
    try {
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const existingData = snapshot.data() as UserProfile;
        if (existingData.status === "suspended") {
          throw new Error("This user account has been suspended by the administrator.");
        }
        const updated = {
          ...existingData,
          lastLogin: Date.now(),
        };
        await setDoc(userRef, { lastLogin: Date.now() }, { merge: true });
        return updated;
      } else {
        await setDoc(userRef, profileData);
      }
    } catch (e: any) {
      if (e.message?.includes("suspended")) {
        throw e;
      }
      console.warn("Firestore sync warning:", e);
    }
  }

  // Also update local list
  const mockUsers = getMockUsers();
  const index = mockUsers.findIndex((u) => u.uid === profileData.uid);
  if (index >= 0) {
    if (mockUsers[index].status === "suspended") {
      throw new Error("This user account has been suspended by the administrator.");
    }
    mockUsers[index] = { ...mockUsers[index], lastLogin: Date.now() };
  } else {
    mockUsers.push(profileData);
  }
  saveMockUsers(mockUsers);

  return profileData;
}

// Cloud Scan History Sync
export async function syncScanToCloud(scan: ScanHistoryItem, user?: UserProfile | null): Promise<void> {
  const db = getFirebaseFirestore();
  const scanDocData = {
    ...scan,
    userId: user?.uid || "guest",
    userEmail: user?.email || "guest@mathicsolve.ai",
    syncedAt: Date.now(),
  };

  if (db && getStoredFirebaseConfig().apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      await setDoc(doc(db, "scan_history", scan.id), scanDocData);
    } catch (e) {
      console.warn("Firestore save scan notice:", e);
    }
  }

  // Always keep in cloud mock store for Admin Manager inspection
  const cloudScans = getMockScans();
  const existingIdx = cloudScans.findIndex((s) => s.id === scan.id);
  if (existingIdx >= 0) {
    cloudScans[existingIdx] = scanDocData;
  } else {
    cloudScans.unshift(scanDocData);
  }
  saveMockScans(cloudScans);
}

// Fetch Cloud Scans (for Admin & User)
export async function fetchCloudScans(): Promise<ScanHistoryItem[]> {
  const db = getFirebaseFirestore();
  if (db && getStoredFirebaseConfig().apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      const q = query(collection(db, "scan_history"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      const items: ScanHistoryItem[] = [];
      snap.forEach((d) => items.push(d.data() as ScanHistoryItem));
      if (items.length > 0) return items;
    } catch (e) {
      console.warn("Firestore fetch scans notice:", e);
    }
  }
  return getMockScans();
}

const LOCAL_STORAGE_DELETED_USERS_KEY = "mathicsolve_deleted_users";

function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_USERS_KEY);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch (e) {
    console.warn("Failed to parse deleted user IDs:", e);
  }
  return new Set<string>();
}

function addDeletedUserId(uid: string) {
  if (!uid) return;
  const deleted = getDeletedUserIds();
  deleted.add(uid);
  try {
    localStorage.setItem(LOCAL_STORAGE_DELETED_USERS_KEY, JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.warn("Failed to save deleted user ID:", e);
  }
}

// Fetch Cloud Users (for Admin Manager)
export async function fetchCloudUsers(): Promise<UserProfile[]> {
  const localUsers = getMockUsers();
  const deletedUids = getDeletedUserIds();

  const userMap = new Map<string, UserProfile>();
  localUsers.forEach((u) => {
    if (!deletedUids.has(u.uid)) {
      userMap.set(u.uid, u);
    }
  });

  const db = getFirebaseFirestore();
  const currentConfig = getStoredFirebaseConfig();
  if (db && currentConfig.apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore fetch timeout")), 2500)
      );
      const snap = await Promise.race([
        getDocs(collection(db, "users")),
        timeoutPromise,
      ]);
      snap.forEach((d) => {
        const data = d.data() as UserProfile;
        const uid = data.uid || d.id;
        if (!deletedUids.has(uid)) {
          const existing = userMap.get(uid);
          if (existing) {
            userMap.set(uid, {
              ...data,
              ...existing, // preserve local edits/status/role/password
              uid,
              email: data.email || existing.email,
            });
          } else {
            userMap.set(uid, {
              ...data,
              uid,
              email: data.email || "user@mathicsolve.ai",
              status: data.status || "active",
              role: data.role || "user",
            });
          }
        }
      });
    } catch (e) {
      console.warn("Firestore fetch users notice:", e);
    }
  }

  const result = Array.from(userMap.values());
  if (result.length > 0) {
    saveMockUsers(result);
    return result;
  }
  return getMockUsers();
}

// Admin Operations
export async function updateUserRole(uid: string, newRole: 'admin' | 'user' | 'pro'): Promise<void> {
  if (!uid) return;
  const mockUsers = getMockUsers();
  const idx = mockUsers.findIndex((u) => u.uid === uid);
  if (idx >= 0) {
    mockUsers[idx].role = newRole;
    saveMockUsers(mockUsers);
  }

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, "users", uid), { role: newRole }, { merge: true });
    } catch (e) {
      console.warn("Update role firestore:", e);
    }
  }
}

export async function updateUserStatus(uid: string, newStatus: 'active' | 'suspended'): Promise<void> {
  if (!uid) return;
  const mockUsers = getMockUsers();
  const idx = mockUsers.findIndex((u) => u.uid === uid);
  if (idx >= 0) {
    mockUsers[idx].status = newStatus;
    saveMockUsers(mockUsers);
  } else {
    mockUsers.push({
      uid,
      email: "user@mathicsolve.ai",
      displayName: "Mathic User",
      role: "user",
      status: newStatus,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      scanCount: 0,
    });
    saveMockUsers(mockUsers);
  }

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, "users", uid), { status: newStatus }, { merge: true });
    } catch (e) {
      console.warn("Update status firestore:", e);
    }
  }
}

export async function deleteAdminUser(uid: string): Promise<void> {
  if (!uid) return;
  if (uid === "admin_master_1") {
    throw new Error("Master System Admin account cannot be deleted.");
  }
  addDeletedUserId(uid);
  const mockUsers = getMockUsers().filter((u) => u.uid !== uid);
  saveMockUsers(mockUsers);

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (e) {
      console.warn("Delete user firestore:", e);
    }
  }
}

export async function createAdminUser(userData: {
  email: string;
  password?: string;
  displayName?: string;
  role: 'admin' | 'user' | 'pro';
  status?: 'active' | 'suspended';
}): Promise<UserProfile> {
  const mockUsers = getMockUsers();
  const existing = mockUsers.find((u) => u.email.toLowerCase() === userData.email.toLowerCase());
  if (existing) {
    throw new Error(`An account with email ${userData.email} already exists.`);
  }

  const newUser: UserProfile = {
    uid: `user_admin_created_${Date.now()}`,
    email: userData.email.trim(),
    displayName: userData.displayName?.trim() || userData.email.split("@")[0],
    role: userData.role,
    password: userData.password || "admin123",
    createdAt: Date.now(),
    lastLogin: Date.now(),
    scanCount: 0,
    status: userData.status || "active",
  };

  mockUsers.unshift(newUser);
  saveMockUsers(mockUsers);

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, "users", newUser.uid), newUser, { merge: true });
    } catch (e) {
      console.warn("Firestore create admin user:", e);
    }
  }

  return newUser;
}

export async function updateAdminUserFull(
  uid: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const mockUsers = getMockUsers();
  const idx = mockUsers.findIndex((u) => u.uid === uid);
  if (idx < 0) {
    throw new Error(`User ID ${uid} not found.`);
  }

  const updatedUser: UserProfile = {
    ...mockUsers[idx],
    ...updates,
  };

  mockUsers[idx] = updatedUser;
  saveMockUsers(mockUsers);

  const db = getFirebaseFirestore();
  if (db) {
    try {
      await setDoc(doc(db, "users", uid), updates, { merge: true });
    } catch (e) {
      console.warn("Firestore update user full:", e);
    }
  }

  return updatedUser;
}

// Collection Documents Inspector & Data Editor (for Built-in Admin Manager)
export async function fetchCollectionDocs(collectionName: string): Promise<CloudDocument[]> {
  const db = getFirebaseFirestore();
  if (db && getStoredFirebaseConfig().apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const list: CloudDocument[] = [];
      snap.forEach((d) => {
        list.push({
          id: d.id,
          collection: collectionName,
          data: d.data(),
          updatedAt: d.data().updatedAt || d.data().timestamp || Date.now(),
        });
      });
      return list;
    } catch (e) {
      console.warn(`Firestore read collection ${collectionName}:`, e);
    }
  }

  // Fallback to mock local collections
  if (collectionName === "users") {
    return getMockUsers().map((u) => ({
      id: u.uid,
      collection: "users",
      data: u,
      updatedAt: u.lastLogin,
    }));
  }
  if (collectionName === "scan_history") {
    return getMockScans().map((s) => ({
      id: s.id,
      collection: "scan_history",
      data: s,
      updatedAt: s.timestamp,
    }));
  }
  
  // Custom collection in local storage
  const key = `mathicsolve_col_${collectionName}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCollectionDoc(collectionName: string, docId: string, data: Record<string, any>): Promise<void> {
  const db = getFirebaseFirestore();
  if (db && getStoredFirebaseConfig().apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      await setDoc(doc(db, collectionName, docId), data, { merge: true });
    } catch (e) {
      console.warn(`Firestore write doc ${collectionName}/${docId}:`, e);
    }
  }

  // Also sync in local store
  if (collectionName === "users") {
    const users = getMockUsers();
    const idx = users.findIndex((u) => u.uid === docId);
    if (idx >= 0) users[idx] = { ...users[idx], ...data };
    else users.push({ uid: docId, ...data } as UserProfile);
    saveMockUsers(users);
  } else if (collectionName === "scan_history") {
    const scans = getMockScans();
    const idx = scans.findIndex((s) => s.id === docId);
    if (idx >= 0) scans[idx] = { ...scans[idx], ...data };
    else scans.push({ id: docId, ...data } as ScanHistoryItem);
    saveMockScans(scans);
  } else {
    const docs = await fetchCollectionDocs(collectionName);
    const idx = docs.findIndex((d) => d.id === docId);
    const updatedDoc: CloudDocument = {
      id: docId,
      collection: collectionName,
      data,
      updatedAt: Date.now(),
    };
    if (idx >= 0) docs[idx] = updatedDoc;
    else docs.unshift(updatedDoc);
    localStorage.setItem(`mathicsolve_col_${collectionName}`, JSON.stringify(docs));
  }
}

export async function deleteCollectionDoc(collectionName: string, docId: string): Promise<void> {
  const db = getFirebaseFirestore();
  if (db && getStoredFirebaseConfig().apiKey !== DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
    } catch (e) {
      console.warn(`Firestore delete doc ${collectionName}/${docId}:`, e);
    }
  }

  if (collectionName === "users") {
    await deleteAdminUser(docId);
  } else if (collectionName === "scan_history") {
    saveMockScans(getMockScans().filter((s) => s.id !== docId));
  } else {
    const docs = (await fetchCollectionDocs(collectionName)).filter((d) => d.id !== docId);
    localStorage.setItem(`mathicsolve_col_${collectionName}`, JSON.stringify(docs));
  }
}

// Local mock data store helpers
export function getMockUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MOCK_USERS_KEY);
    if (raw) {
      let parsed: UserProfile[] = JSON.parse(raw);

      // Reassign legacy users that shared admin_master_1 uid if they are not admin@gmail.com
      parsed = parsed.map((u, idx) => {
        if (u.uid === "admin_master_1" && u.email.toLowerCase() !== "admin@gmail.com") {
          return { ...u, uid: `user_legacy_${idx}_${u.email.replace(/[^a-zA-Z0-9]/g, "_")}` };
        }
        return u;
      });

      let mainAdmin = parsed.find((u) => u.email.toLowerCase() === "admin@gmail.com");
      if (!mainAdmin) {
        mainAdmin = {
          uid: "admin_master_1",
          email: "admin@gmail.com",
          displayName: "System Admin",
          role: "admin",
          password: "admin",
          createdAt: Date.now() - 86400000 * 30,
          lastLogin: Date.now(),
          scanCount: 42,
          status: "active",
        };
        parsed.unshift(mainAdmin);
      } else {
        mainAdmin.uid = "admin_master_1";
        mainAdmin.role = "admin";
        mainAdmin.password = "admin";
      }

      // Deduplicate by uid and email and filter out deleted users
      const deletedUids = getDeletedUserIds();
      const seenUids = new Set<string>();
      const seenEmails = new Set<string>();
      const cleanList: UserProfile[] = [];

      for (const user of parsed) {
        const emailLower = user.email.toLowerCase();
        if (!deletedUids.has(user.uid) && !seenUids.has(user.uid) && !seenEmails.has(emailLower)) {
          seenUids.add(user.uid);
          seenEmails.add(emailLower);
          cleanList.push(user);
        }
      }

      saveMockUsers(cleanList);
      return cleanList;
    }
  } catch (e) {
    console.warn("Failed to read mock users:", e);
  }
  // Default initial admin & sample users
  const defaults: UserProfile[] = [
    {
      uid: "admin_master_1",
      email: "admin@gmail.com",
      displayName: "System Admin",
      role: "admin",
      password: "admin",
      createdAt: Date.now() - 86400000 * 30,
      lastLogin: Date.now(),
      scanCount: 42,
      status: "active",
    },
    {
      uid: "user_sample_1",
      email: "student@mathicsolve.ai",
      displayName: "Alex Rivers",
      role: "user",
      password: "student123",
      createdAt: Date.now() - 86400000 * 7,
      lastLogin: Date.now() - 3600000,
      scanCount: 15,
      status: "active",
    },
    {
      uid: "user_sample_2",
      email: "pro.mathematician@gmail.com",
      displayName: "Dr. Elena Vance",
      role: "pro",
      password: "propass123",
      createdAt: Date.now() - 86400000 * 14,
      lastLogin: Date.now() - 1800000,
      scanCount: 88,
      status: "active",
    },
  ];
  saveMockUsers(defaults);
  return defaults;
}

function saveMockUsers(users: UserProfile[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MOCK_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Failed to save mock users:", e);
  }
}

function getMockScans(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MOCK_SCANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to read mock scans:", e);
  }
  return [];
}

function saveMockScans(scans: ScanHistoryItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MOCK_SCANS_KEY, JSON.stringify(scans));
  } catch (e) {
    console.warn("Failed to save mock scans:", e);
  }
}
