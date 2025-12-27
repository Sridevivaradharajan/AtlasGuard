
import React, { useEffect, useRef, useState } from 'react';
import { LogEntry, LogType, RemediationState, ProjectRequest } from '../types';
import { Terminal, ShieldAlert, Cpu, ArrowRight, Sparkles, Check, RefreshCw, Copy, ShieldCheck } from 'lucide-react';

interface ReasoningConsoleProps {
  logs: LogEntry[];
  isAnalyzing: boolean;
  remediationState: RemediationState;
  request: ProjectRequest;
  onApplyFix: (fixedRequest: ProjectRequest) => void;
}

const ReasoningConsole: React.FC<ReasoningConsoleProps> = ({ 
  logs, 
  isAnalyzing, 
  remediationState, 
  request,
  onApplyFix 
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [fixedDataSource, setFixedDataSource] = useState("");
  const [isTypingFix, setIsTypingFix] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulate typing the fix when remediation is detected
  useEffect(() => {
    if (remediationState === RemediationState.DETECTED) {
      setIsTypingFix(true);
      // More robust sanitized text to satisfy Red Team agents
      const targetText = "Synthetic identity vectors (GDPR Compliant) with differential privacy (ε=0.5) enabled.";
      let i = 0;
      setFixedDataSource("");
      const interval = setInterval(() => {
        setFixedDataSource(targetText.substring(0, i));
        i++;
        if (i > targetText.length) {
          clearInterval(interval);
          setIsTypingFix(false);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [remediationState]);

  const handleCopy = () => {
      if (fixedDataSource) {
          navigator.clipboard.writeText(fixedDataSource);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }
  };

  const handleApply = () => {
      // Crucial: Sanitize BOTH Data Source AND Intended Use
      // If we only fix the source, the malicious intent (e.g., "doxxing") remains in the prompt for Red Team.
      const safeRequest = {
          ...request,
          dataSource: fixedDataSource,
          intendedUse: "Aggregated safety analysis on anonymized datasets for regional density auditing."
      };
      onApplyFix(safeRequest);
  };

  const getLogColor = (type: LogType) => {
    switch (type) {
      case LogType.WARNING: return 'text-amber-400';
      case LogType.ERROR: return 'text-red-500 font-bold';
      case LogType.SUCCESS: return 'text-emerald-400';
      case LogType.SYSTEM: return 'text-blue-400';
      default: return 'text-slate-300';
    }
  };

  // View: Live Reasoning Logs
  const renderLogs = () => (
    <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm space-y-1 relative bg-black/40">
      {logs.length === 0 && !isAnalyzing && (
        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
          <ShieldAlert className="w-12 h-12 mb-2" />
          <p>AWAITING INPUT STREAM...</p>
        </div>
      )}

      {logs.map((log) => (
        <div key={log.id} className={`flex gap-3 ${getLogColor(log.type)} animate-fade-in`}>
          <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
          {log.agent && <span className="text-slate-500 shrink-0">[{log.agent}]</span>}
          <span className="whitespace-pre-wrap">{log.message}</span>
        </div>
      ))}
      
      {isAnalyzing && (
        <div className="text-blue-400 animate-pulse font-bold mt-2">_</div>
      )}
      <div ref={bottomRef} />
    </div>
  );

  // View: Auto-Fix Comparison
  const renderRemediation = () => (
    <div className="flex-1 flex flex-col p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-full">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">Remediation Zone Active</h3>
                <p className="text-xs text-slate-400">Governance Engine proposes the following sanitization.</p>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 h-full">
            {/* Risky Input */}
            <div className="flex-1 border border-red-500/30 bg-red-950/10 rounded-xl p-4 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" /> Risky Input Detected
                </span>
                <div className="flex-1 font-mono text-sm text-slate-300 relative z-10 break-words">
                    <p className="bg-red-500/10 inline px-1 rounded text-red-200">{request.dataSource}</p>
                </div>
                {/* Noise overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
            </div>

            <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-slate-600 md:rotate-0 rotate-90" />
            </div>

            {/* Sanitized Input */}
            <div className="flex-1 border border-emerald-500/30 bg-emerald-950/10 rounded-xl p-4 flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50"></div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Sanitized Output
                    </span>
                    <button 
                        onClick={handleCopy}
                        className="text-emerald-500/50 hover:text-emerald-400 transition-colors"
                        title="Copy to Clipboard"
                    >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
                <div className="flex-1 font-mono text-sm text-emerald-100/90 relative z-10 break-words">
                    {fixedDataSource}
                    {isTypingFix && <span className="w-2 h-4 bg-emerald-400 inline-block ml-1 animate-pulse align-middle"></span>}
                </div>
                
                <div className="mt-4 pt-4 border-t border-emerald-500/20">
                     <button 
                        onClick={handleApply}
                        disabled={isTypingFix}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/25"
                    >
                        {remediationState === RemediationState.APPLYING ? (
                            <>Applying Fix...</>
                        ) : (
                            <><ShieldCheck className="w-4 h-4" /> Apply Fix & Proceed</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative scanline transition-all duration-500">
      {/* Header */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-3 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-mono font-bold text-slate-200 tracking-wider">
            DECISION_ENGINE::KERNEL
          </span>
        </div>
        <div className="flex items-center gap-3">
             {remediationState !== RemediationState.IDLE && (
                 <span className="text-[10px] font-mono text-purple-400 animate-pulse uppercase border border-purple-500/30 px-2 py-0.5 rounded bg-purple-500/10">
                    REMEDIATION_MODE
                 </span>
             )}
             {isAnalyzing && (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded border border-blue-500/20">
                    <Cpu className="w-3 h-3 text-blue-400 animate-spin" />
                    <span className="text-[10px] font-mono text-blue-400">PROCESSING</span>
                </div>
            )}
        </div>
      </div>

      {/* Conditional Content */}
      {remediationState === RemediationState.DETECTED || remediationState === RemediationState.APPLYING ? renderRemediation() : renderLogs()}

      {/* Footer */}
      <div className="bg-slate-900/50 border-t border-slate-800 p-2 text-[10px] font-mono text-slate-500 flex justify-between shrink-0">
        <span>ATLASGUARD_v3.0_HEALER</span>
        <span>LATENCY: 12ms</span>
      </div>
    </div>
  );
};

export default ReasoningConsole;
