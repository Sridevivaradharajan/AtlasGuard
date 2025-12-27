
export enum RiskLevel {
  UNKNOWN = 'UNKNOWN',
  LOW = 'LOW', // "Blue"
  MEDIUM = 'MEDIUM', // "Yellow" - Uncertainty
  HIGH = 'HIGH', // "Orange"
  CRITICAL = 'CRITICAL' // "Red"
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT'
}

export enum IngestionMode {
  TEXT = 'TEXT', // Forensic Path
  UPLOAD = 'UPLOAD' // Signaling Path
}

// v12 FUSION MASTER STATE MACHINE
export enum AnalysisState {
  IDLE = 'IDLE',
  INGESTED = 'INGESTED',
  GOVERNANCE_GATE_REVIEW = 'GOVERNANCE_GATE_REVIEW', // Layer 1: Policy Check
  FORENSIC_PARSING_AUTHORIZED = 'FORENSIC_PARSING_AUTHORIZED', // Layer 2: Auth
  PARSING_RESTRICTED = 'PARSING_RESTRICTED', // Blocked at Gate
  CONTENT_EXTRACTED = 'CONTENT_EXTRACTED', // OCR/Text Layer
  SEMANTIC_ANALYSIS = 'SEMANTIC_ANALYSIS', // Gemini
  UNCERTAINTY_EVALUATED = 'UNCERTAINTY_EVALUATED', // Failure Mode Check
  RISK_DETECTED = 'RISK_DETECTED',
  SAFE = 'SAFE',
  REMEDIATING = 'REMEDIATING',
  OVERRIDE_CEREMONY = 'OVERRIDE_CEREMONY',
  RED_TEAM_SIMULATION = 'RED_TEAM_SIMULATION', // New State
  COMPLETED = 'COMPLETED'
}

export interface User {
  id: string;
  key: string;
  name: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  clearanceLevel: number;
}

export interface AuditLogEntry {
  id: string;
  time: string;
  mode: string; // Forensic or Signal
  details: string;
  risk: string;
  action: string;
  status: string;
  justification?: string; // For overrides
}

export interface AnalysisReport {
  id: string;
  timestamp: string;
  filename: string;
  fileType: string;
  riskScore: number;
  status: 'APPROVED' | 'BLOCKED' | 'RESOLVED' | 'OVERRIDDEN';
  findings: string[];
  markdownAssessment?: string; // New field for the full AI summary
  confidence: number;
  extractionMethod: 'NATIVE_TEXT' | 'OCR_HYBRID' | 'METADATA_ONLY';
  blindSpots: string[];
  governanceAuth: string;
  toolResults: {
    googleKG: string;
    patents: string;
    toxicity: string;
  };
  decisionTrace?: TraceStep[];
}

export interface TraceStep {
  id: string;
  label: string;
  confidence: number; // 0-1
  status: 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'WARN' | 'ERROR';
  message: string;
}

// --- Component Specific Types ---

export enum InputMode {
  TEXT = 'TEXT',
  NATURAL = 'NATURAL',
  UPLOAD = 'UPLOAD'
}

export interface DataRow {
  id: string;
  [key: string]: any;
}

export interface ProjectRequest {
  projectName: string;
  mode: InputMode;
  content: string;
  modelType: string;
  dataSource: string;
  intendedUse: string;
}

export enum LogType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  SYSTEM = 'SYSTEM'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
  agent?: string;
}

export enum RemediationState {
  IDLE = 'IDLE',
  DETECTED = 'DETECTED',
  APPLYING = 'APPLYING',
  RESOLVED = 'RESOLVED'
}
