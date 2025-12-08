export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface Client {
  id: string;
  name: string;
  password: string; // Auto-generated
  email?: string;
  viewableClientIds?: string[]; // IDs of other clients this client can view
  lastLogin?: string; // ISO String timestamp of last login
}

export interface Material {
  name: string;
  units: number;
}

export interface DocumentData {
  hours: number;
  isResolved: boolean;
  materials: Material[];
}

export interface DocumentFile {
  id: string;
  clientId: string;
  fileName: string;
  uploadDate: string; // ISO String
  fileData: string; // Base64 (simulated storage)
  mimeType: string;
  status: 'processing' | 'assigned' | 'error';
  data?: DocumentData; // Data extracted by AI
}

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  clientId?: string; // If role is CLIENT
}

// Result from Gemini analysis
export interface AnalysisResult {
  clientName: string;
  confidence: number;
  data: DocumentData;
}