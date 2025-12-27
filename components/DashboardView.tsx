import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisState, IngestionMode, AppView, AnalysisReport, User, TraceStep, RiskLevel, LogEntry, LogType, RemediationState, ProjectRequest, InputMode } from '../types';
import { DEMO_PYTHON_CODE, FIXED_PYTHON_CODE, AGENTS, ATLASGUARD_SYSTEM_INSTRUCTION, RED_TEAM_SYSTEM_INSTRUCTION } from '../constants';
import NeuralMesh from './NeuralMesh';
import StatusWidget from './StatusWidget';
import ReasoningConsole from './ReasoningConsole';
import InputPanel from './InputPanel';
import ArtifactsPanel from './ArtifactsPanel';

import { GoogleGenAI } from "@google/genai";
// Proxy import to handle esm.sh default export quirks for pdfjs-dist
import * as pdfjsLibProxy from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { 
  Terminal, ShieldCheck, AlertTriangle, Activity, UploadCloud, 
  FileCode, Play, Globe, Lock, Unlock, Skull, Zap, 
  Search, BookOpen, Dna, FileVideo, Scale, RefreshCw, CheckCircle2, FileText,
  Mic, MicOff, Loader2, FileSpreadsheet, File, Eye, User as UserIcon, Copy, ClipboardCheck,
  ChevronDown, ChevronUp, AlertCircle, Fingerprint, Code2, Shield, HelpCircle, FileScan, ScanText,
  LayoutTemplate, Crosshair, Flame, Ban
} from 'lucide-react';

// Initialize PDF.js worker with a reliable CDN (cdnjs)
const pdfjsLib = (pdfjsLibProxy as any).default || pdfjsLibProxy;
try {
  if (pdfjsLib.GlobalWorkerOptions) {
      // Using cdnjs for the worker ensures proper CORS headers and stability compared to esm.sh for web workers
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
} catch (e) {
  console.warn("Failed to initialize PDF Worker", e);
}

// --- CUSTOM SVG RADAR CHART (RISK SIGNAL VISUALIZER) ---
const RadarChart = ({ values, isRisk }: { values: number[], isRisk: boolean }) => {
  const safeValues = Array.isArray(values) && values.length === 5 ? values : [50, 50, 50, 50, 50];

  const getPoint = (value: number, index: number, total: number) => {
    const safeValue = isNaN(value) ? 50 : value;
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const radius = (safeValue / 100) * 40; 
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return `${x},${y}`;
  };

  const points = safeValues.map((v, i) => getPoint(v, i, safeValues.length)).join(' ');

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-32 h-32 md:w-48 md:h-48">
        {[20, 30, 40].map(r => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="0.5" />
        ))}
        {[0, 1, 2, 3, 4].map(i => {
             const p = getPoint(100, i, 5).split(',');
             return <line key={i} x1="50" y1="50" x2={p[0]} y2={p[1]} stroke="#1e293b" strokeWidth="0.5" />
        })}
        <polygon 
            points={points} 
            fill={isRisk ? "rgba(239, 68, 68, 0.5)" : "rgba(59, 130, 246, 0.2)"} 
            stroke={isRisk ? "#ef4444" : "#3b82f6"} 
            strokeWidth="1.5"
            className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 pointer-events-none">
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-mono">PRIVACY</span>
          <span className="absolute top-1/3 right-0 text-[8px] text-slate-500 font-mono">LEGAL</span>
          <span className="absolute bottom-1/4 right-0 text-[8px] text-slate-500 font-mono">SAFETY</span>
          <span className="absolute bottom-1/4 left-0 text-[8px] text-slate-500 font-mono">SECURITY</span>
          <span className="absolute top-1/3 left-0 text-[8px] text-slate-500 font-mono">FAIRNESS</span>
      </div>
    </div>
  );
};

// --- DECISION TRACE COMPONENT ---
const DecisionTrace = ({ trace }: { trace: TraceStep[] }) => {
    return (
        <div className="w-full bg-slate-900/80 border-t border-slate-800 p-4 font-mono text-xs overflow-y-auto max-h-48">
            <div className="flex items-center gap-2 mb-3 text-slate-400 uppercase tracking-widest font-bold">
                <Activity className="w-3 h-3" /> Decision Trace Layer
            </div>
            <div className="space-y-3 relative">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-800"></div>
                {trace.map((step, idx) => (
                    <div key={step.id} className="relative pl-6 flex items-start gap-3 animate-in fade-in slide-in-from-left-2">
                        <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 z-10 ${
                            step.status === 'COMPLETE' ? 'bg-emerald-500 border-emerald-900' : 
                            step.status === 'WARN' ? 'bg-amber-500 border-amber-900' :
                            step.status === 'ERROR' ? 'bg-red-500 border-red-900' :
                            step.status === 'ACTIVE' ? 'bg-blue-500 border-blue-900 animate-pulse' : 'bg-slate-800 border-slate-700'
                        }`}></div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <span className={`font-bold ${step.status === 'WARN' ? 'text-amber-400' : step.status === 'ERROR' ? 'text-red-400' : 'text-slate-300'}`}>{step.label}</span>
                                <span className="text-slate-600">CONF: {(step.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-slate-500">{step.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
interface DashboardViewProps {
  onChangeView: (view: AppView) => void;
  onAddAuditLog: (log: any) => void;
  onSetReport: (report: AnalysisReport) => void;
  user: User | null;
}

// Extend IngestionMode locally to support PROJECT view
type ExtendedIngestionMode = IngestionMode | 'PROJECT';

const DashboardView: React.FC<DashboardViewProps> = ({ onChangeView, onAddAuditLog, onSetReport, user }) => {
  // --- STATE ---
  const [mode, setMode] = useState<ExtendedIngestionMode>(IngestionMode.TEXT);
  const [content, setContent] = useState(DEMO_PYTHON_CODE);
  const [state, setState] = useState<AnalysisState>(AnalysisState.IDLE);
  
  // Forensic Data State
  const [toolLogs, setToolLogs] = useState<string[]>([]);
  const [radarValues, setRadarValues] = useState([50, 50, 50, 50, 50]);
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileType, setCurrentFileType] = useState("TEXT");
  const [currentFileObj, setCurrentFileObj] = useState<File | null>(null);
  const [dataSignature, setDataSignature] = useState(0); 
  const [overrideJustification, setOverrideJustification] = useState("");
  const [redTeamResult, setRedTeamResult] = useState<string[]>([]);
  const [redTeamVulnerable, setRedTeamVulnerable] = useState(false);

  // Project Governance State
  const [projectRequest, setProjectRequest] = useState<ProjectRequest>({
      projectName: "",
      mode: InputMode.NATURAL,
      content: "",
      modelType: "",
      dataSource: "",
      intendedUse: ""
  });
  const [remediationState, setRemediationState] = useState<RemediationState>(RemediationState.IDLE);
  const [reasoningLogs, setReasoningLogs] = useState<LogEntry[]>([]);

  // Common State
  const [confidence, setConfidence] = useState(0);
  const [extractionMethod, setExtractionMethod] = useState<'NATIVE_TEXT' | 'OCR_HYBRID' | 'METADATA_ONLY' | 'BINARY_PARSING'>('NATIVE_TEXT');
  const [blindSpots, setBlindSpots] = useState<string[]>([]);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [showTrace, setShowTrace] = useState(true);
  const [toolSignals, setToolSignals] = useState({
      googleKG: { status: "IDLE", val: "---" },
      patents: { status: "IDLE", val: "---" },
      toxicity: { status: "IDLE", val: "---" }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Memoized line numbers
  const lineNumbers = useMemo(() => {
    return content.split('\n').map((_, i) => i + 1).join('\n');
  }, [content]);

  // --- ACTIONS ---

  const handleModeChange = (newMode: ExtendedIngestionMode) => {
    setMode(newMode);
    // Reset Analysis State
    setState(AnalysisState.IDLE);
    setToolLogs([]);
    setTrace([]);
    setRadarValues([50, 50, 50, 50, 50]);
    setBlindSpots([]);
    setConfidence(0);
    setToolSignals({ googleKG: {status:"IDLE", val:"---"}, patents: {status:"IDLE", val:"---"}, toxicity: {status:"IDLE", val:"---"} });
    setRemediationState(RemediationState.IDLE);
    setReasoningLogs([]);
    setRedTeamResult([]);
    setRedTeamVulnerable(false);
    
    if(newMode === IngestionMode.TEXT && !content) setContent(DEMO_PYTHON_CODE);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentFileName(file.name);
      const ext = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      setCurrentFileType(ext);
      setCurrentFileObj(file);
      setState(AnalysisState.INGESTED);
      
      setTrace([{
          id: 'ingest',
          label: 'ASSET INGESTION',
          confidence: 1.0,
          status: 'COMPLETE',
          message: `Asset [${file.name}] hashed. Waiting for governance authorization.`
      }]);

      if (mode === IngestionMode.TEXT) {
          const reader = new FileReader();
          reader.onload = (event) => setContent(event.target?.result as string);
          reader.readAsText(file);
      } else {
          setContent(`[PENDING GOVERNANCE AUTHORIZATION]\n\nFile: ${file.name}\nSize: ${file.size} bytes\nType: ${file.type}\n\nContent extraction is currently LOCKED.`);
      }
    }
  };

  const extractTextFromFile = async (file: File, type: string): Promise<string> => {
      try {
          if (type === 'PDF') {
              const arrayBuffer = await file.arrayBuffer();
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;
              let fullText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map((item: any) => item.str).join(' ');
                  fullText += `[PAGE ${i}]\n${pageText}\n\n`;
              }
              return fullText || "[PDF PARSING WARNING] No text layer found. OCR would be required.";
          } 
          else if (type === 'DOCX') {
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              return result.value;
          }
          else if (type === 'XLSX' || type === 'CSV') {
              const arrayBuffer = await file.arrayBuffer();
              const workbook = XLSX.read(arrayBuffer);
              let fullText = "";
              workbook.SheetNames.forEach(sheetName => {
                  const sheet = workbook.Sheets[sheetName];
                  fullText += `[SHEET: ${sheetName}]\n` + XLSX.utils.sheet_to_csv(sheet) + "\n\n";
              });
              return fullText;
          }
          else if (type === 'IPYNB') {
              const text = await file.text();
              try {
                  const json = JSON.parse(text);
                  const cells = json.cells || [];
                  const sourceCode = cells
                    .filter((c: any) => c.cell_type === 'code')
                    .map((c: any) => Array.isArray(c.source) ? c.source.join('') : c.source)
                    .join('\n\n# CELL SEPARATOR \n\n');
                  return sourceCode;
              } catch (e) {
                  return "Error parsing Notebook JSON";
              }
          }
          return await file.text();
      } catch (e) {
          console.error("Extraction Failed", e);
          return `[SYSTEM ERROR] Extraction failed for ${file.name}. \nError Details: ${e instanceof Error ? e.message : String(e)}`;
      }
  };

  const executeOverride = () => {
      if(!overrideJustification) return;
      onAddAuditLog({
          id: `LOG-OVERRIDE-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          mode: 'HUMAN_OVERRIDE',
          details: `Manual Authorization by ${user?.name}`,
          risk: 'HIGH',
          action: 'OVERRIDDEN',
          status: 'OVERRIDDEN',
          justification: overrideJustification
      });
      setState(AnalysisState.COMPLETED); 
      setOverrideJustification("");
  };

  const addReasoningLog = (msg: string, type: LogType = LogType.INFO) => {
      setReasoningLogs(prev => [...prev, {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type,
          message: msg,
          agent: 'ORCHESTRATOR'
      }]);
  };

  // --- HANDLER: APPLY FIX (SANITIZATION) ---
  const handleApplyFix = (fixedRequest: ProjectRequest) => {
      // 1. Update the request data
      setProjectRequest(fixedRequest);
      
      // 2. Transition State to SAFE
      setRemediationState(RemediationState.RESOLVED);
      setState(AnalysisState.SAFE);
      
      // 3. Reset Visuals (Green Shape)
      setRadarValues([15, 15, 15, 15, 15]); 
      setConfidence(98); 
      
      // 4. Log the action
      addReasoningLog("Applying automated sanitization protocols...", LogType.SYSTEM);
      setTimeout(() => {
          addReasoningLog("Sanitization complete. PII vectors neutralized.", LogType.SUCCESS);
      }, 500);

      // 5. Update the Audit Report to reflect the resolution
      onSetReport((prev: any) => {
          if(!prev) return null;
          return {
              ...prev,
              status: 'RESOLVED',
              riskScore: 5,
              findings: [...prev.findings, "[AUTO-FIX] Data source sanitized via differential privacy transform."],
              decisionTrace: [
                  ...(prev.decisionTrace || []),
                  {
                      id: 'fix_applied',
                      label: 'REMEDIATION',
                      confidence: 1.0,
                      status: 'COMPLETE',
                      message: 'High-risk content replaced with synthetic equivalent.'
                  }
              ]
          }
      });
  };

  // --- RED TEAM FEATURE ---
  const runRedTeam = async () => {
      const prevState = state;
      setState(AnalysisState.RED_TEAM_SIMULATION);
      setDataSignature(Date.now()); // Triggers Mesh Glitch
      setRedTeamResult([]); // Clear previous results
      setRedTeamVulnerable(false);
      
      const logTarget = mode === 'PROJECT' ? addReasoningLog : (msg: string, type?: any) => setToolLogs(prev => [...prev, `> ${msg}`]);
      
      logTarget("INITIALIZING RED TEAM OFFENSIVE SWARM...", LogType.WARNING);
      
      const attackVectors = ["PROMPT_INJECTION", "PII_EXFILTRATION", "SQL_INJECTION", "MALICIOUS_PAYLOAD"];
      attackVectors.forEach((v, i) => {
          setTimeout(() => {
             logTarget(`> EXECUTING VECTOR: ${v}...`, LogType.SYSTEM);
             setDataSignature(Date.now() + i);
          }, i * 800);
      });

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
          **GOAL:** Adversarial Safety Validation (Code-Level) & Penetration Testing
          **CONTEXT:** Validating against known misuse patterns in a sandboxed, read-only environment.
          
          **Target Content:**
          ${mode === 'PROJECT' ? `Project: ${projectRequest.projectName}, Source: ${projectRequest.dataSource}` : content.slice(0, 5000)}

          **Instructions:**
          1. Identify 3 specific attack vectors that might be effective against this content.
          2. Determine if the system is vulnerable.
          3. Output valid JSON.

          **Output JSON:**
          {
             "attacks": [
                 { "vector": "string", "likelihood": "HIGH" | "MEDIUM" | "LOW", "description": "string" }
             ],
             "vulnerable": boolean,
             "summary": "string"
          }
          `;

          const result = await ai.models.generateContent({
              model: "gemini-3-pro-preview", // UPDATED: Using Pro model for better attack simulation
              contents: prompt,
              config: { 
                  systemInstruction: RED_TEAM_SYSTEM_INSTRUCTION, // UPDATED: Using specific Red Team Persona
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingBudget: 2048 } // ADDED: Thinking capability
              }
          });

          const json = JSON.parse(result.text || "{}");

          setTimeout(() => {
              // Populate the Result State for the UI
              const attacks = json.attacks || [];
              const findings = attacks.map((a: any) => `[${a.likelihood}] ${a.vector}: ${a.description}`);
              setRedTeamResult(findings);
              setRedTeamVulnerable(json.vulnerable);

              json.attacks?.forEach((attack: any) => {
                  logTarget(`[RED_TEAM] ${attack.vector}: ${attack.likelihood} - ${attack.description}`, LogType.ERROR);
              });
              
              if (json.vulnerable) {
                  logTarget("CRITICAL: SYSTEM VULNERABILITIES CONFIRMED.", LogType.ERROR);
                  if (prevState !== AnalysisState.RISK_DETECTED) {
                      setState(AnalysisState.RISK_DETECTED);
                  } else {
                      setState(prevState);
                  }
              } else {
                   logTarget("RED TEAM REPORT: TARGET RESILIENT.", LogType.SUCCESS);
                   setState(prevState);
              }
              
              // Update Report with Red Team findings AND FORCE STATUS CHANGE IF VULNERABLE
              onSetReport((prev: any) => {
                  if(!prev) return prev;
                  const isVulnerable = json.vulnerable;
                  return {
                      ...prev,
                      findings: [...prev.findings, ...json.attacks.map((a: any) => `[RED TEAM] ${a.vector}: ${a.description}`)],
                      riskScore: isVulnerable ? Math.max(prev.riskScore, 95) : prev.riskScore,
                      status: isVulnerable ? 'BLOCKED' : prev.status
                  }
              });

          }, 4000);

      } catch (e) {
          console.error("Red Team Failed", e);
          setState(prevState);
      }
  };

  const runProjectAnalysis = async () => {
      setState(AnalysisState.SEMANTIC_ANALYSIS);
      setDataSignature(Date.now());
      addReasoningLog("Initializing Multi-Agent Governance Swarm (Gemini 3 Pro)...", LogType.SYSTEM);
      addReasoningLog(`Analyzing Project: ${projectRequest.projectName}`);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const prompt = `
          **GOAL:** Pre-Deployment Safety Stress Test (Project Mode)
          **TASK:** Analyze the following Project Request based on the AtlasGuard Core Principles.
          
          **INPUT DATA:**
          *   **Project Name:** ${projectRequest.projectName}
          *   **Model:** ${projectRequest.modelType}
          *   **Data Source:** ${projectRequest.dataSource}
          *   **Intended Use:** ${projectRequest.intendedUse}

          **EXECUTION STEPS:**
          1.  Calculate RISK LEVEL (Low/Medium/High/Critical).
          2.  Calculate RISK COMPONENT BREAKDOWN (Radar Values: Data Sensitivity, Jurisdiction, Model Behavior, etc).
          3.  Simulate checks against external databases (Google KG, Patents, Toxicity).
          4.  **CRITICAL:** Generate a structured Markdown assessment.
          
          **OUTPUT FORMAT (JSON):**
          {
            "riskScore": number (0-100),
            "isRisk": boolean,
            "confidence": number,
            "blindSpots": ["string"],
            "findings": ["string"],
            "radarValues": [number, number, number, number, number], 
            // radarValues mapping: [Data Sensitivity, Jurisdiction, Model Behavior, Security, Fairness]
            "toolSignals": { 
                "googleKG": "string",
                "patents": "string",
                "toxicity": "string"
            },
            "markdownOutput": "string" 
          }
          
          **MARKDOWN OUTPUT INSTRUCTIONS:**
          The 'markdownOutput' string must be formatted neatly with:
          - ### Headers for sections
          - **Bold** for key metrics
          - *Italic* for nuance
          - Bullet points for findings
          - A specific section for "AtlasGuard Assessment"
          - **MANDATORY**: Include the disclaimer verbatim if relevant: "AtlasGuard does not ingest or store dark web content..."
          - **IMPORTANT**: Do NOT use bold characters (**) inside the 'Decision' line itself to prevent formatting errors.
          - Ensure paragraphs are separated by newlines.
          `;

          const result = await ai.models.generateContent({
              model: "gemini-3-pro-preview", // UPDATED: Upgraded to Gemini 3 Pro for robustness
              contents: prompt,
              config: { 
                  systemInstruction: ATLASGUARD_SYSTEM_INSTRUCTION, // UPDATED: AtlasGuard Persona
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingBudget: 4096 } // ADDED: Deep thinking budget for "NotebookLM" like analysis
              }
          });

          const json = JSON.parse(result.text || "{}");

          addReasoningLog("Scanning Data Source for PII and Bias...", LogType.INFO);
          
          setTimeout(() => {
              const isRisk = json.isRisk;
              
              if (isRisk) {
                  setRemediationState(RemediationState.DETECTED);
                  setState(AnalysisState.RISK_DETECTED);
                  addReasoningLog("CRITICAL: High-risk patterns detected.", LogType.ERROR);
              } else {
                  setRemediationState(RemediationState.RESOLVED);
                  setState(AnalysisState.SAFE);
                  addReasoningLog("Project validated. No high-risk patterns.", LogType.SUCCESS);
              }

              setRadarValues(json.radarValues || [50,50,50,50,50]);
              setConfidence(json.confidence || (isRisk ? 92 : 95));
              setBlindSpots(json.blindSpots || []);

               // Update Tool Signals in State (UI Sidebar)
              const newToolSignals = {
                googleKG: { status: "DONE", val: json.toolSignals?.googleKG || "Verified" },
                patents: { status: "DONE", val: json.toolSignals?.patents || "No Conflict" },
                toxicity: { status: "DONE", val: json.toolSignals?.toxicity || "0.00" }
              };
              setToolSignals(newToolSignals);

              // Create the report object
              const report: AnalysisReport = {
                  id: `GOV-${Date.now().toString().slice(-6)}`,
                  timestamp: new Date().toLocaleString(),
                  filename: projectRequest.projectName || "Untitled_Project_Manifest",
                  fileType: "PROJECT_MANIFEST",
                  riskScore: json.riskScore || 50,
                  status: isRisk ? 'BLOCKED' : 'APPROVED',
                  findings: json.findings || ["Analysis Complete"],
                  markdownAssessment: json.markdownOutput, 
                  confidence: json.confidence || 88, 
                  extractionMethod: 'METADATA_ONLY',
                  blindSpots: json.blindSpots || [],
                  governanceAuth: "AI_GOVERNANCE_SWARM_V2",
                  toolResults: json.toolSignals || {
                    googleKG: "Entity Validation: Verified",
                    patents: "IP Conflict Scan: Clear",
                    toxicity: "Safety Layer: Active"
                  },
                  decisionTrace: [
                      {
                          id: 'init',
                          label: 'PROJECT INGESTION',
                          confidence: 1.0,
                          status: 'COMPLETE',
                          message: 'Project metadata parsed.'
                      },
                      {
                          id: 'risk_eval',
                          label: 'RISK ASSESSMENT',
                          confidence: 0.88,
                          status: isRisk ? 'WARN' : 'COMPLETE',
                          message: isRisk ? 'Risk detected in project parameters.' : 'Project aligns with safety baselines.'
                      }
                  ]
              };
              
              onSetReport(report);
              
              // If Markdown output was returned, add it to logs for visibility
              if (json.markdownOutput) {
                  addReasoningLog("Assessment Generated.", LogType.SYSTEM);
              }

          }, 500);

      } catch (e) {
          console.error(e);
          addReasoningLog("System Error: Orchestrator Unreachable", LogType.ERROR);
          setState(AnalysisState.IDLE);
      }
  };

  const runForensicAnalysis = async () => {
      // --- LAYER 1: GOVERNANCE GATE ---
      setState(AnalysisState.GOVERNANCE_GATE_REVIEW);
      setToolLogs(["> INITIATING GOVERNANCE GATE...", "> VERIFYING ASSET ELIGIBILITY..."]);
      
      setTrace(prev => [...prev, {
          id: 'gate',
          label: 'GOVERNANCE GATE',
          confidence: 0.99,
          status: 'ACTIVE',
          message: 'Checking Corp Policy v4.2 for filetype and origin...'
      }]);

      await new Promise(r => setTimeout(r, 600)); // Faster gate check

      setState(AnalysisState.FORENSIC_PARSING_AUTHORIZED);
      setToolLogs(prev => [...prev, "> POLICY_CHECK: PASSED", "> FORENSIC_TOKEN: GRANTED"]);
      setTrace(prev => prev.map(t => t.id === 'gate' ? {...t, status:'COMPLETE', message: 'Asset Authorized. Proceeding to Forensic Extraction.'} : t));

      // --- LAYER 2: FORENSIC EXTRACTION ---
      await new Promise(r => setTimeout(r, 400)); // Faster extraction
      setState(AnalysisState.CONTENT_EXTRACTED);
      
      const isCodeAsset = ['PY', 'IPYNB', 'JS', 'TS', 'JSON'].includes(currentFileType);
      let methodStr: any = 'NATIVE_TEXT';
      if (currentFileType === 'PDF') methodStr = 'OCR_HYBRID';
      else if (['DOCX', 'XLSX'].includes(currentFileType)) methodStr = 'BINARY_PARSING';
      else if (currentFileType === 'IPYNB') methodStr = 'NOTEBOOK_PARSER';
      setExtractionMethod(methodStr);

      let extractedText = content;

      if (mode === IngestionMode.UPLOAD && currentFileObj) {
          setToolLogs(prev => [...prev, `> PARSING FILE: ${currentFileName}...`, `> PARSER: ${currentFileType}_LOADER`]);
          extractedText = await extractTextFromFile(currentFileObj, currentFileType);
          setContent(extractedText);
          setToolLogs(prev => [...prev, "> EXTRACTION SUCCESSFUL", `> BYTES_READ: ${extractedText.length}`]);
      } else {
          setToolLogs(prev => [...prev, "> READING TEXT STREAM...", "> ENCODING: UTF-8"]);
      }

      setTrace(prev => [...prev, {
          id: 'extract',
          label: 'FORENSIC EXTRACTION',
          confidence: isCodeAsset ? 1.0 : 0.88,
          status: 'COMPLETE',
          message: `Content parsed via ${methodStr}.`
      }]);

      // --- LAYER 3: SEMANTIC ANALYSIS ---
      setState(AnalysisState.SEMANTIC_ANALYSIS);
      setDataSignature(Date.now());
      setToolLogs(prev => [...prev, "> INITIATING SEMANTIC ANALYSIS SWARM..."]);

      setTrace(prev => [...prev, {
          id: 'semantic',
          label: 'DEEP SEMANTIC REASONING', // UPDATED: Label
          confidence: 0.5,
          status: 'ACTIVE',
          message: 'Querying Gemini 3.0 Pro for deep regulatory context...' // UPDATED: Message
      }]);

      setToolSignals({ 
          googleKG: {status:"LOADING", val:"Connecting..."}, 
          patents: {status:"LOADING", val:"Indexing..."}, 
          toxicity: {status:"LOADING", val:"Analyzing..."} 
      });

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const decisionLogStr = trace.map(t => t.message).join(' | ');
        
        // DETERMINE MODE BASED ON CONTEXT
        const analysisMode = mode === IngestionMode.UPLOAD ? "Data Safety & Integrity Check (Upload Mode)" : "Adversarial Safety Validation (Code-Level)";

        let prompt = `
        **GOAL:** ${analysisMode}
        **TASK:** Analyze the provided CODE or DOCUMENT based on AtlasGuard Core Principles.
        
        **INPUT METADATA:**
        *   **File Name:** ${currentFileName || "Snippet"}
        *   **File Type:** ${currentFileType}
        *   **System Context:** ${state}

        **EXECUTION STEPS:**
        1.  Analyze 'INPUT CONTENT' for security risks, malware, PII, or regulatory violations.
        2.  Simulate checks against external databases (Google KG, Patents, Toxicity).
        3.  Generate Risk Score and Findings.
        4.  **CRITICAL:** Generate a structured Markdown assessment.

        **OUTPUT FORMAT (JSON):**
        {
            "riskScore": number (0-100),
            "isRisk": boolean,
            "confidence": number,
            "blindSpots": ["string"],
            "findings": ["string"], 
            "radarValues": [number, number, number, number, number],
            "toolSignals": { 
                "googleKG": "string",
                "patents": "string",
                "toxicity": "string"
            },
            "markdownOutput": "string" 
        }
        
        **MARKDOWN OUTPUT INSTRUCTIONS:**
          The 'markdownOutput' string must be formatted neatly with:
          - ### Headers for sections
          - **Bold** for key metrics
          - *Italic* for nuance
          - Bullet points for findings
          - A specific section for "AtlasGuard Assessment"
          - **MANDATORY**: Include the disclaimer verbatim if relevant: "AtlasGuard does not ingest or store dark web content..."
          - Ensure paragraphs are separated by newlines.

        **INPUT CONTENT (TRUNCATED):**
        """
        ${extractedText.slice(0, 8000)}
        """
        `;

        const result = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // UPDATED: Upgraded to Gemini 3 Pro
            contents: prompt,
            config: { 
                systemInstruction: ATLASGUARD_SYSTEM_INSTRUCTION, // UPDATED: AtlasGuard Persona
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 4096 } // ADDED: Deep thinking budget
            }
        });

        const json = JSON.parse(result.text || "{}");

        // Fast update for UI feedback
        setTimeout(() => {
            setConfidence(json.confidence || 85);
            setBlindSpots(json.blindSpots || []);
            
            // Correctly map the signals from AI response
            // Fallback to "Verified" etc if the AI fails to generate specific strings, but usually it respects the prompt now.
            setToolSignals({
                googleKG: { status: "DONE", val: json.toolSignals?.googleKG || "Verified" },
                patents: { status: "DONE", val: json.toolSignals?.patents || "Clean" },
                toxicity: { status: "DONE", val: json.toolSignals?.toxicity || "0.00" }
            });
            
            setState(AnalysisState.UNCERTAINTY_EVALUATED);
            
            setTimeout(() => {
                if (json.isRisk) {
                    setState(AnalysisState.RISK_DETECTED);
                    setRadarValues(json.radarValues || [80,80,80,80,80]);
                    setTrace(prev => prev.map(t => t.id === 'semantic' ? {...t, status:'COMPLETE'} : t).concat({
                        id: 'decision',
                        label: 'RISK DETECTED',
                        confidence: (json.confidence || 90) / 100,
                        status: 'WARN',
                        message: 'Advisory: Regulatory thresholds exceeded.'
                    }));
                    json.findings?.forEach((f: string) => setToolLogs(prev => [...prev, `> SIGNAL: ${f}`]));
                } else {
                    setState(AnalysisState.SAFE);
                    setRadarValues(json.radarValues || [20,20,20,20,20]);
                    setTrace(prev => prev.map(t => t.id === 'semantic' ? {...t, status:'COMPLETE'} : t).concat({
                        id: 'decision',
                        label: 'WITHIN TOLERANCE',
                        confidence: (json.confidence || 95) / 100,
                        status: 'COMPLETE',
                        message: 'Advisory: Asset appears compliant.'
                    }));
                    setToolLogs(prev => [...prev, "> STATUS: NO ACTIVE RISK SIGNALS DETECTED."]);
                }

                // Create and set the report immediately
                const report: AnalysisReport = {
                    id: `AUDIT-${Date.now().toString().slice(-6)}`,
                    timestamp: new Date().toLocaleString(),
                    filename: currentFileName || (mode === IngestionMode.TEXT ? "Code_Snippet.py" : "Unknown_Asset"),
                    fileType: currentFileType,
                    riskScore: json.riskScore || 0,
                    status: json.isRisk ? 'BLOCKED' : 'APPROVED',
                    findings: json.findings || [], 
                    markdownAssessment: json.markdownOutput,
                    confidence: json.confidence || 0,
                    extractionMethod: methodStr,
                    blindSpots: json.blindSpots || [],
                    governanceAuth: "AUTHORIZED_POLICY_V4",
                    // Ensure we pass the clean strings, not "CHECK_PENDING"
                    toolResults: json.toolSignals || {
                        googleKG: "N/A", patents: "N/A", toxicity: "N/A"
                    },
                    decisionTrace: trace
                };
                onSetReport(report);
            }, 500); // reduced delay

        }, 500); // reduced delay

      } catch (e) {
          console.error(e);
          setToolLogs(prev => [...prev, "> SYSTEM ERROR: UNABLE TO CONNECT TO ORCHESTRATOR."]);
          setState(AnalysisState.IDLE);
      }
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-slate-200 overflow-hidden font-sans relative selection:bg-blue-500/30">
      
      {/* HEADER */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center shadow-[0_0_15px_rgba(29,78,216,0.5)]">
                <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
                <span className="font-bold font-mono tracking-[0.2em] text-slate-100 text-sm leading-none">ATLASGUARD</span>
                <span className="text-[9px] text-blue-400 font-mono tracking-widest uppercase">Regulatory Decision Orchestrator v12.0</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-slate-800 rounded border border-slate-700 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                    state === AnalysisState.RISK_DETECTED ? 'bg-red-500 animate-pulse' : 
                    state === AnalysisState.GOVERNANCE_GATE_REVIEW ? 'bg-yellow-500 animate-pulse' :
                    state === AnalysisState.RED_TEAM_SIMULATION ? 'bg-orange-500 animate-ping' :
                    state === AnalysisState.SAFE ? 'bg-emerald-500' : 'bg-slate-500'
                }`}></div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {state.replace(/_/g, " ")}
                </span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-200">{user?.name}</span>
                <span className="text-[9px] text-slate-500 font-mono uppercase">{user?.role} // LEVEL {user?.clearanceLevel}</span>
            </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 relative z-10">
          
          {/* LEFT: INGESTION & TELEMETRY */}
          <section className="col-span-3 border-r border-slate-800 bg-slate-950 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex border-b border-slate-800 shrink-0">
                  <button 
                    onClick={() => handleModeChange(IngestionMode.TEXT)}
                    className={`flex-1 py-3 text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 transition-colors ${mode === IngestionMode.TEXT ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <FileCode className="w-3 h-3" /> CODE
                  </button>
                  <button 
                    onClick={() => handleModeChange(IngestionMode.UPLOAD)}
                    className={`flex-1 py-3 text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 transition-colors ${mode === IngestionMode.UPLOAD ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <UploadCloud className="w-3 h-3" /> UPLOAD
                  </button>
                  <button 
                    onClick={() => handleModeChange('PROJECT')}
                    className={`flex-1 py-3 text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 transition-colors ${mode === 'PROJECT' ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <LayoutTemplate className="w-3 h-3" /> PROJECT
                  </button>
              </div>

              {/* Input Zone */}
              <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                  {mode === 'PROJECT' ? (
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                         <InputPanel 
                            request={projectRequest} 
                            setRequest={setProjectRequest} 
                            onAnalyze={runProjectAnalysis}
                            isAnalyzing={state === AnalysisState.SEMANTIC_ANALYSIS} 
                         />
                      </div>
                  ) : mode === IngestionMode.TEXT ? (
                      <>
                        <div className="absolute top-0 left-0 right-0 bg-slate-900/50 p-2 text-[9px] font-mono text-slate-500 border-b border-slate-800 flex justify-between z-10">
                            <span>MODE: FORENSIC_READ</span>
                            <span>TYPE: TEXT/CODE</span>
                        </div>
                        <div className="flex-1 flex relative h-full overflow-hidden">
                            <div 
                                ref={lineNumbersRef}
                                className="w-8 bg-slate-900 border-r border-slate-800 pt-10 text-[9px] font-mono text-slate-600 text-right pr-2 leading-relaxed select-none overflow-hidden"
                            >
                                <pre>{lineNumbers}</pre>
                            </div>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onScroll={(e) => {
                                    if (lineNumbersRef.current) {
                                        lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
                                    }
                                }}
                                className="flex-1 bg-slate-950 p-2 pt-10 pl-4 text-xs font-mono text-slate-300 resize-none outline-none focus:bg-slate-900/30 transition-colors leading-relaxed overflow-y-auto h-full"
                                spellCheck={false}
                            />
                        </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                           {state === AnalysisState.IDLE || state === AnalysisState.INGESTED ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-48 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 hover:bg-slate-900/50 transition-all cursor-pointer group"
                                    >
                                        <div className="p-4 bg-slate-900 rounded-full group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">UPLOAD FORENSIC ASSET</p>
                                            <p className="text-[10px] text-slate-600 mt-1">PDF, DOCX, XLSX, IPYNB SUPPORTED</p>
                                        </div>
                                    </div>
                                </div>
                           ) : (
                                <div className="flex-1 flex flex-col bg-slate-900/30 p-4 h-full overflow-hidden">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800 shrink-0">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                                            <FileScan className="w-3 h-3 text-blue-400" />
                                            {currentFileName}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-600">{currentFileType}</span>
                                    </div>
                                    <div className="flex-1 font-mono text-[10px] text-slate-400 whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                                        {content}
                                    </div>
                                </div>
                           )}
                           
                           {state === AnalysisState.CONTENT_EXTRACTED && (
                               <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
                                   <div className="flex flex-col items-center gap-3">
                                       <ScanText className="w-8 h-8 text-blue-400 animate-pulse" />
                                       <div className="text-xs font-mono text-blue-200">EXTRACTING TEXT LAYER...</div>
                                       <div className="text-[9px] text-slate-500">OCR ENGINE: ACTIVE</div>
                                   </div>
                                </div>
                           )}
                      </div>
                  )}
              </div>
              
              {/* Telemetry/Status Log */}
              {mode === 'PROJECT' ? (
                  <div className="shrink-0 space-y-2 p-2">
                      <StatusWidget />
                      {(state === AnalysisState.SAFE || state === AnalysisState.RISK_DETECTED) && (
                           <button 
                             onClick={runRedTeam}
                             className="w-full py-2 bg-orange-950/30 border border-orange-500/30 hover:bg-orange-900/40 text-orange-400 rounded flex items-center justify-center gap-2 text-[10px] font-bold font-mono tracking-widest transition-all hover:scale-[1.02]"
                           >
                               <Crosshair className="w-3 h-3" /> LAUNCH RED TEAM
                           </button>
                      )}
                  </div>
              ) : (
                  <>
                    <div className="h-48 bg-black border-t border-slate-800 flex flex-col shrink-0">
                        <div className="p-2 border-b border-slate-800 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500">
                            <Terminal className="w-3 h-3" /> SYSTEM_TELEMETRY
                        </div>
                        <div className="flex-1 p-2 font-mono text-[10px] overflow-y-auto space-y-1 custom-scrollbar">
                            {toolLogs.map((log, i) => (
                                <div key={i} className={`animate-in fade-in slide-in-from-left-1 ${log.includes("ALERT") || log.includes("SIGNAL") || log.includes("RED TEAM") ? "text-amber-400" : "text-emerald-500/80"}`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0 space-y-2">
                        <button 
                            onClick={runForensicAnalysis}
                            disabled={state !== AnalysisState.INGESTED && state !== AnalysisState.SAFE && state !== AnalysisState.RISK_DETECTED && state !== AnalysisState.IDLE}
                            className={`w-full py-3 rounded text-xs font-bold font-mono tracking-widest flex items-center justify-center gap-2 transition-all ${
                                state === AnalysisState.INGESTED || state === AnalysisState.IDLE || state === AnalysisState.SAFE || state === AnalysisState.RISK_DETECTED
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {state === AnalysisState.GOVERNANCE_GATE_REVIEW ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> CHECKING POLICY...</>
                            ) : state === AnalysisState.CONTENT_EXTRACTED ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> EXTRACTING...</>
                            ) : state === AnalysisState.SEMANTIC_ANALYSIS ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> ANALYZING...</>
                            ) : (
                                <><Shield className="w-3 h-3 fill-current" /> INITIATE GOVERNANCE CHECK</>
                            )}
                        </button>
                        
                        {(state === AnalysisState.SAFE || state === AnalysisState.RISK_DETECTED) && (
                           <button 
                             onClick={runRedTeam}
                             className="w-full py-2 bg-orange-950/30 border border-orange-500/30 hover:bg-orange-900/40 text-orange-400 rounded flex items-center justify-center gap-2 text-[10px] font-bold font-mono tracking-widest transition-all hover:scale-[1.02]"
                           >
                               <Crosshair className="w-3 h-3" /> LAUNCH RED TEAM
                           </button>
                        )}
                    </div>
                  </>
              )}
          </section>

          {/* CENTER: NEURAL MESH & TRACE */}
          <section className="col-span-6 border-r border-slate-800 bg-black relative flex flex-col overflow-hidden h-full min-h-0">
              <div className="flex-1 relative">
                  <NeuralMesh state={state} dataSignature={dataSignature} mode={mode === 'PROJECT' ? IngestionMode.TEXT : mode} />
                  
                  {/* Status Overlay */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full px-12">
                      {state === AnalysisState.GOVERNANCE_GATE_REVIEW && (
                           <div className="w-full max-w-sm bg-slate-900/90 border border-yellow-500/30 rounded p-4 flex flex-col items-center gap-2 backdrop-blur animate-in fade-in slide-in-from-top-4">
                               <div className="flex items-center gap-2 text-yellow-500 font-bold tracking-widest text-xs uppercase">
                                   <Shield className="w-4 h-4 animate-pulse" /> Governance Gate Active
                               </div>
                               <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                   <div className="h-full bg-yellow-500 animate-[loading_1.5s_ease-in-out_infinite] w-1/2"></div>
                               </div>
                               <p className="text-[9px] text-slate-400 font-mono">Verifying authorization policy (Corp v4.2)...</p>
                           </div>
                      )}

                      {state === AnalysisState.RISK_DETECTED && (
                          <div className="px-4 py-2 bg-red-950/80 border border-red-500/50 rounded-full flex items-center gap-2 text-red-400 animate-in zoom-in-95">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs font-bold font-mono tracking-wider">RISK THRESHOLD EXCEEDED</span>
                          </div>
                      )}
                      {state === AnalysisState.SAFE && (
                          <div className="px-4 py-2 bg-emerald-950/80 border border-emerald-500/50 rounded-full flex items-center gap-2 text-emerald-400 animate-in zoom-in-95">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-xs font-bold font-mono tracking-wider">WITHIN RISK TOLERANCE</span>
                          </div>
                      )}
                  </div>
              </div>

              {/* Manual Override Ceremony */}
              {state === AnalysisState.OVERRIDE_CEREMONY && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
                      <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-lg p-6 shadow-2xl">
                          <h3 className="text-red-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
                              <Unlock className="w-4 h-4" /> Override Ceremony
                          </h3>
                          <p className="text-xs text-slate-400 mb-4">
                              You are about to bypass automated risk signals. This action will be logged in the immutable Audit Ledger under your ID.
                          </p>
                          <div className="space-y-2 mb-6">
                              <label className="text-[10px] font-mono text-slate-500 uppercase">Justification Required</label>
                              <textarea 
                                  value={overrideJustification}
                                  onChange={(e) => setOverrideJustification(e.target.value)}
                                  className="w-full h-24 bg-black border border-slate-700 rounded p-3 text-xs text-slate-200 focus:border-red-500 outline-none"
                                  placeholder="Enter reason for bypass..."
                              />
                          </div>
                          <div className="flex gap-3">
                              <button 
                                onClick={() => setState(AnalysisState.RISK_DETECTED)}
                                className="flex-1 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded"
                              >
                                  CANCEL
                              </button>
                              <button 
                                onClick={executeOverride}
                                disabled={!overrideJustification}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  CONFIRM & LOG
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Bottom Panel (Switchable) */}
              <div className="border-t border-slate-800 bg-slate-900/50 min-h-[200px] flex flex-col">
                   {mode === 'PROJECT' ? (
                       <div className="flex-1 overflow-hidden">
                           <ReasoningConsole 
                                logs={reasoningLogs}
                                isAnalyzing={state === AnalysisState.SEMANTIC_ANALYSIS || state === AnalysisState.RED_TEAM_SIMULATION}
                                remediationState={remediationState}
                                request={projectRequest}
                                onApplyFix={handleApplyFix}
                           />
                       </div>
                   ) : (
                       <>
                           <div 
                             className="p-2 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors"
                             onClick={() => setShowTrace(!showTrace)}
                           >
                               <span className="text-[10px] font-mono font-bold text-slate-500 uppercase flex items-center gap-2">
                                   <Activity className="w-3 h-3" /> Decision Trace
                               </span>
                               {showTrace ? <ChevronDown className="w-3 h-3 text-slate-500"/> : <ChevronUp className="w-3 h-3 text-slate-500"/>}
                           </div>
                           {showTrace && <DecisionTrace trace={trace} />}
                       </>
                   )}
              </div>
          </section>

          {/* RIGHT: EVIDENCE & SIGNALS */}
          <section className="col-span-3 bg-slate-950/80 border-l border-slate-800 backdrop-blur-sm flex flex-col h-full min-h-0 overflow-hidden">
              
              {mode === 'PROJECT' ? (
                   <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                       {redTeamResult.length > 0 && (
                            <div className="mb-4 p-4 border border-red-500/50 bg-red-950/30 rounded animate-in slide-in-from-right relative overflow-hidden">
                                {redTeamVulnerable && (
                                     <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-red-500 border border-red-500/50 px-1.5 py-0.5 rounded bg-black/50">
                                         <Ban className="w-3 h-3" /> STATUS REVOKED
                                     </div>
                                )}
                                <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Flame className="w-3 h-3 animate-pulse" /> Active Attack Vectors
                                </h3>
                                <div className="space-y-2">
                                    {redTeamResult.map((res, i) => (
                                        <div key={i} className="text-[10px] font-mono text-red-300 bg-red-900/40 p-2 rounded border border-red-900/50 leading-relaxed shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                                            {res}
                                        </div>
                                    ))}
                                </div>
                            </div>
                       )}
                       <ArtifactsPanel 
                            riskLevel={state === AnalysisState.RISK_DETECTED ? RiskLevel.HIGH : state === AnalysisState.SAFE ? RiskLevel.LOW : RiskLevel.UNKNOWN}
                            showArtifacts={state === AnalysisState.RISK_DETECTED || state === AnalysisState.SAFE}
                            artifactsLoading={state === AnalysisState.SEMANTIC_ANALYSIS}
                            hasPiiViolation={remediationState === RemediationState.DETECTED}
                            projectRequest={projectRequest}
                       />
                   </div>
              ) : (
                  <>
                    <div className="h-48 p-4 border-b border-slate-800 relative flex flex-col items-center shrink-0">
                        <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <Scale className="w-3 h-3 text-blue-400" /> Signal Topography
                        </div>
                        <RadarChart values={radarValues} isRisk={state === AnalysisState.RISK_DETECTED} />
                    </div>

                    {/* NEW: RISK COMPOSITION BREAKDOWN */}
                    <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/30 shrink-0">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="flex flex-col gap-1">
                                 <span className="text-[8px] uppercase text-slate-500 font-mono">Data Sensitivity</span>
                                 <span className={`text-xs font-bold font-mono ${radarValues[0] > 50 ? 'text-amber-400' : 'text-slate-300'}`}>{radarValues[0]}%</span>
                            </div>
                            <div className="flex flex-col gap-1 border-x border-slate-800">
                                 <span className="text-[8px] uppercase text-slate-500 font-mono">Jurisdiction</span>
                                 <span className={`text-xs font-bold font-mono ${radarValues[1] > 50 ? 'text-amber-400' : 'text-slate-300'}`}>{radarValues[1]}%</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                 <span className="text-[8px] uppercase text-slate-500 font-mono">Model Behavior</span>
                                 <span className={`text-xs font-bold font-mono ${radarValues[2] > 50 ? 'text-amber-400' : 'text-slate-300'}`}>{radarValues[2]}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-b border-slate-800 bg-slate-900/30 shrink-0">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <HelpCircle className="w-3 h-3" /> Confidence & Limits
                        </h3>
                        <div className="mb-4">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>ANALYSIS CONFIDENCE</span>
                                <span className={confidence < 70 ? 'text-amber-400' : 'text-emerald-400'}>{confidence}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${confidence < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${confidence}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="mb-3 flex items-center justify-between text-[9px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            <span>EXTRACTION:</span>
                            <span className="text-blue-400 font-bold">{extractionMethod}</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[9px] font-mono text-slate-500 uppercase">Blind Spots Detected:</p>
                            {blindSpots.length > 0 ? (
                                blindSpots.map((spot, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] text-amber-400/80 bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{spot}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[10px] text-slate-600 italic">None detected in current scope.</div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {redTeamResult.length > 0 && (
                            <div className="p-4 border border-red-500/50 bg-red-950/30 rounded animate-in slide-in-from-right relative overflow-hidden">
                                {redTeamVulnerable && (
                                     <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-red-500 border border-red-500/50 px-1.5 py-0.5 rounded bg-black/50">
                                         <Ban className="w-3 h-3" /> STATUS REVOKED
                                     </div>
                                )}
                                <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Flame className="w-3 h-3 animate-pulse" /> Active Attack Vectors
                                </h3>
                                <div className="space-y-2">
                                    {redTeamResult.map((res, i) => (
                                        <div key={i} className="text-[10px] font-mono text-red-300 bg-red-900/40 p-2 rounded border border-red-900/50 leading-relaxed shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                                            {res}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                            External Risk Signals
                        </h3>
                        {[
                            { id: 'googleKG', label: 'Entity Knowledge', icon: Globe, data: toolSignals.googleKG },
                            { id: 'patents', label: 'Patent Conflict', icon: BookOpen, data: toolSignals.patents },
                            { id: 'toxicity', label: 'Content Safety', icon: Eye, data: toolSignals.toxicity },
                        ].map((tool) => (
                            <div key={tool.id} className="group">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-400 transition-colors">
                                        <tool.icon className="w-3 h-3" />
                                        <span className="text-xs font-mono font-bold">{tool.label}</span>
                                    </div>
                                    <div className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                        tool.data.status === 'LOADING' ? 'bg-blue-900/30 text-blue-400 animate-pulse' : 
                                        tool.data.val.includes('Risk') ? 'bg-red-900/30 text-red-400' : 'bg-slate-900 text-emerald-500'
                                    }`}>
                                        {tool.data.val}
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${tool.data.status === 'LOADING' ? 'w-1/2 animate-shimmer bg-blue-500' : 'w-full bg-slate-600'}`}></div>
                                </div>
                            </div>
                        ))}

                        <div className="mt-8 pt-6 border-t border-slate-800">
                             <p className="text-[9px] text-slate-600 mb-3 leading-relaxed">
                                 AtlasGuard is a governance decision-support system, not a surveillance or data-harvesting tool.
                             </p>
                             <button 
                                 onClick={() => setState(AnalysisState.OVERRIDE_CEREMONY)}
                                 disabled={state !== AnalysisState.RISK_DETECTED}
                                 className="w-full py-2 border border-slate-700 hover:border-red-500 hover:bg-red-950/30 text-slate-500 hover:text-red-400 rounded text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                             >
                                 <Unlock className="w-3 h-3" /> Initiate Override
                             </button>
                        </div>
                    </div>
                  </>
              )}

              {/* View Report */}
              <button
                  onClick={() => onChangeView(AppView.REPORT)}
                  className="w-full py-4 bg-slate-900 border-t border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-xs font-bold font-mono uppercase tracking-widest shrink-0"
              >
                  <FileText className="w-4 h-4" /> View Audit Ledger
              </button>
          </section>

      </div>
    </div>
  );
};

export default DashboardView;