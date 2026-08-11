export interface MathStep {
  stepNumber: string;
  title: string;
  expression: string;
  explanation?: string;
}

export interface MathSolution {
  isReadable: boolean;
  problemDetected: string;
  topic: string;
  finalAnswer: string;
  steps: MathStep[];
  simpleExplanation: string;
  detailedExplanation: string;
  verification?: string;
  rawText?: string;
  errorMessage?: string;
}

export interface SampleProblem {
  id: string;
  title: string;
  topic: string;
  expression: string;
  previewImage?: string;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  problemDetected: string;
  topic: string;
  finalAnswer: string;
  solution: MathSolution;
  imageThumbnail?: string;
  userId?: string;
  userEmail?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user' | 'pro';
  photoURL?: string;
  createdAt: number;
  lastLogin: number;
  scanCount: number;
  status?: 'active' | 'suspended';
  password?: string;
}

export interface CloudDocument {
  id: string;
  collection: string;
  data: Record<string, any>;
  updatedAt?: number;
}
