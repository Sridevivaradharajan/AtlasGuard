
import React, { useState } from 'react';
import { AppView, AuditLogEntry, AnalysisReport } from '../types';
import { ArrowLeft, FileText, Download, ShieldCheck, AlertTriangle, DollarSign, Globe, BookOpen, Search, Loader2, Lock, FileCode, ScanLine, BrainCircuit, Server } from 'lucide-react';

interface AuditViewProps {
  onChangeView: (view: AppView) => void;
  auditLogs: AuditLogEntry[];
  currentReport: AnalysisReport | null;
}

const AuditView: React.FC<AuditViewProps> = ({ onChangeView, auditLogs, currentReport }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    // Short delay to allow state update and any render cycles to complete before print dialog blocks JS
    setTimeout(() => {
        window.print();
        setIsExporting(false);
    }, 500);
  };

  // Improved parser for mixed inline markdown
  const parseInlineMarkdown = (text: string) => {
    // 1. Handle Bold Italic (***...***)
    // 2. Handle Bold (**...**)
    // 3. Handle Italic (*...*)
    
    // We split by a regex that captures all three forms
    const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g);
    
    return parts.map((part, index) => {
      // Bold Italic
      if (part.startsWith('***') && part.endsWith('***')) {
          return <strong key={index} className="font-bold text-slate-900 print:text-black"><em className="italic">{part.slice(3, -3)}</em></strong>;
      }
      // Bold
      if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-slate-900 print:text-black">{part.slice(2, -2)}</strong>;
      }
      // Italic
      if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index} className="italic text-slate-800 print:text-black">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const renderMarkdown = (text?: string) => {
    if (!text) return null;
    
    // Pre-process: Clean up messy AI output like "** **CRITICAL" or "**Label:** **Value**"
    // Also handle literal newline chars if they escaped weirdly in JSON
    const cleanText = text
        .replace(/\\n/g, '\n') // Fix literal \n string
        .replace(/\*\*\s+\*\*/g, "**") // Remove double bold markers with space
        .replace(/:\*\*/g, ": **") // Ensure space after colon before bold
        .replace(/\*\*\s*:\s*\*\*/g, ": "); // Remove empty bold around colons

    return cleanText.split('\n').map((line, i) => {
        const trimmed = line.trim();
        
        // Handle Horizontal Rules (--- or ***)
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
             return <hr key={i} className="my-6 border-t-2 border-slate-200 print:border-gray-300" />;
        }

        // Handle Headers (Flexible 1-6 hash) using Regex
        // Captures "#### Header" -> level 4, content "Header"
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            
            // Map levels to styles
            if (level <= 2) {
                 return <h2 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-4 print:text-black uppercase tracking-tight border-b-2 border-slate-800 pb-2">{content}</h2>;
            }
            if (level === 3) {
                 return <h3 key={i} className="text-lg font-bold text-slate-800 mt-6 mb-3 print:text-black uppercase tracking-wide border-b border-slate-300 pb-1">{content}</h3>;
            }
            if (level >= 4) {
                 // Handles #### and ##### often used by AI for sub-sections
                 return <h4 key={i} className="text-sm font-bold text-slate-700 mt-4 mb-2 print:text-black uppercase tracking-wider flex items-center gap-2 before:content-[''] before:w-2 before:h-2 before:bg-blue-500/50 before:rounded-full">{content}</h4>;
            }
        }
        
        // Fallback for Bold Headers not using # (Common in AI output: **Header**)
        const boldHeaderMatch = trimmed.match(/^\*\*(.*?)\*\*[:]?$/);
        if (boldHeaderMatch) {
             if (boldHeaderMatch[1].length < 60) {
                 return <h4 key={i} className="text-sm font-bold text-slate-700 mt-4 mb-2 print:text-black uppercase tracking-wider">{boldHeaderMatch[1]}</h4>;
             }
        }

        // Handle List Items (Bullet points * or -)
        if (trimmed.match(/^[-*]\s+/)) {
             const content = trimmed.replace(/^[-*]\s+/, '');
             return (
                <li key={i} className="flex items-start gap-3 ml-2 mb-2 text-sm text-slate-800 print:text-black leading-relaxed">
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                     <span>{parseInlineMarkdown(content)}</span>
                </li>
            );
        }

        // Handle Disclaimer Specifically (if the AI outputs it verbatim as requested)
        if (trimmed.includes("AtlasGuard does not ingest or store dark web content")) {
            return (
                <div key={i} className="my-6 p-4 bg-slate-100 border-l-4 border-slate-500 text-xs text-slate-600 italic">
                    <strong className="block text-slate-700 not-italic mb-1 uppercase tracking-wider text-[10px]">Compliance Note:</strong>
                    {trimmed}
                </div>
            );
        }

        // Handle Empty Lines
        if (trimmed === '') return <div key={i} className="h-3"></div>;

        // Handle Regular Paragraphs
        return <p key={i} className="text-sm text-slate-700 mb-1 print:text-black leading-relaxed">{parseInlineMarkdown(trimmed)}</p>;
    });
  };

  const getStatusColor = (status: string) => {
      if (status === 'APPROVED' || status === 'RESOLVED') return 'bg-emerald-600';
      if (status === 'OVERRIDDEN') return 'bg-amber-600';
      return 'bg-red-600';
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-900 text-slate-200 p-8 font-sans print:bg-white print:text-black print:p-0 print:m-0 print:h-auto print:overflow-visible custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 print:max-w-none print:space-y-4 print:w-full">
        
        {/* Header - Hidden in Print */}
        <div className="flex items-center justify-between print:hidden">
          <button 
            onClick={() => onChangeView(AppView.DASHBOARD)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-xl font-mono tracking-widest text-slate-200">
            ATLASGUARD // ANALYSIS REPORT
          </h1>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-slate-100 text-slate-900 px-4 py-2 rounded font-bold text-sm hover:bg-white transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "PREPARING..." : "EXPORT PDF"}
          </button>
        </div>

        {/* Report Paper Container */}
        <div className="bg-slate-200 text-slate-900 rounded-sm shadow-2xl overflow-hidden min-h-[800px] flex flex-col print:shadow-none print:min-h-0 print:overflow-visible print:rounded-none print:border-none mb-12">
          
          {/* Paper Header */}
          <div className="bg-slate-300 p-8 border-b border-slate-400 flex justify-between items-start print:bg-white print:border-b-2 print:border-black print:p-8">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-800 print:text-black">
                {currentReport ? 'Single Asset Analysis' : 'Aggregate Compliance Ledger'}
              </h2>
              <p className="text-sm font-mono text-slate-600 mt-1 print:text-gray-600">Generated by AtlasGuard v12.0 Governance Engine</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-slate-500 uppercase print:text-gray-500">Report ID</p>
              <p className="font-mono font-bold print:text-black">{currentReport ? currentReport.id : `#ISO-${new Date().getFullYear()}-AGG`}</p>
              <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-600 font-bold uppercase print:text-gray-600">
                 <Server className="w-3 h-3" /> Compatible with Google Model Cards
              </div>
            </div>
          </div>

          {currentReport ? (
            /* --- SINGLE REPORT VIEW --- */
            <div className="flex-1 p-8 print:p-8 space-y-8">
                {/* Executive Summary */}
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">Target Asset</h3>
                        <div className="text-xl font-bold text-slate-900 mb-1 print:text-black flex items-center gap-2">
                             <FileCode className="w-5 h-5 text-slate-500" />
                             {currentReport.filename}
                        </div>
                        <div className="text-xs font-mono text-slate-600 mb-3">{currentReport.fileType} // {currentReport.extractionMethod}</div>
                        <div className={`inline-block px-2 py-1 rounded text-xs font-bold text-white print:text-black print:border print:border-black ${getStatusColor(currentReport.status)}`}>
                            {currentReport.status}
                        </div>
                    </div>
                    <div>
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">Governance & Risk</h3>
                         <div className="flex items-end gap-2">
                             <div className="text-4xl font-bold text-slate-900 print:text-black">{currentReport.riskScore}/100</div>
                             <div className="text-sm text-slate-500 mb-1 print:text-gray-600">Impact Score</div>
                         </div>
                         <div className="mt-2 text-sm text-slate-600 font-mono flex items-center gap-2">
                             <Lock className="w-3 h-3" />
                             Auth: {currentReport.governanceAuth}
                         </div>
                    </div>
                </div>

                {/* AI ANALYST INSIGHTS (NEW) */}
                <div className="border-t border-slate-300 pt-6 print:border-gray-300">
                    <div className="flex items-center gap-2 mb-4">
                        <BrainCircuit className="w-5 h-5 text-blue-600 print:text-black" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest print:text-gray-600">AI Regulatory Analyst Summary</h3>
                    </div>
                    
                    {currentReport.markdownAssessment ? (
                        <div className="bg-slate-50 p-6 rounded border border-slate-200 print:bg-white print:border-black print:p-0">
                            {renderMarkdown(currentReport.markdownAssessment)}
                        </div>
                    ) : (
                         <div className="bg-slate-50 p-6 rounded border border-slate-200 print:bg-white print:border-black">
                            <ul className="space-y-2">
                                {currentReport.findings.map((finding, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-800 font-mono text-sm">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        {finding}
                                    </li>
                                ))}
                            </ul>
                         </div>
                    )}
                </div>

                {/* External Tool Verification Section */}
                <div className="border-t border-slate-300 pt-6 print:border-gray-300">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">External Verification & Tooling</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded border border-slate-300 print:border-black">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 print:text-black">
                                <Globe className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Google Knowledge Graph</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 print:text-black">{currentReport.toolResults.googleKG}</p>
                        </div>
                        <div className="bg-white p-4 rounded border border-slate-300 print:border-black">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 print:text-black">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Google Patents API</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 print:text-black">{currentReport.toolResults.patents}</p>
                        </div>
                        <div className="bg-white p-4 rounded border border-slate-300 print:border-black">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 print:text-black">
                                <Search className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Perspective API</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 print:text-black">{currentReport.toolResults.toxicity}</p>
                        </div>
                    </div>
                </div>

                {/* Uncertainty Disclosure (v12) */}
                <div className="border-t border-slate-300 pt-6 print:border-gray-300">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 print:text-gray-600">Uncertainty & Forensic Limits</h3>
                    <div className="bg-slate-100 p-4 rounded border border-slate-300 print:bg-white print:border-black">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase block print:text-black">Analysis Confidence</span>
                                <span className="text-sm font-bold text-slate-800 print:text-black">{currentReport.confidence}%</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase block print:text-black">Extraction Method</span>
                                <span className="text-sm font-bold text-slate-800 flex items-center gap-2 print:text-black">
                                    <ScanLine className="w-3 h-3" />
                                    {currentReport.extractionMethod}
                                </span>
                            </div>
                        </div>
                        <div>
                             <span className="text-xs font-bold text-slate-500 uppercase print:text-black">Blind Spots:</span>
                             <ul className="list-disc list-inside mt-1 text-sm text-slate-700 print:text-black">
                                 {currentReport.blindSpots.length > 0 ? (
                                     currentReport.blindSpots.map((spot, i) => <li key={i}>{spot}</li>)
                                 ) : (
                                     <li>No significant blind spots declared.</li>
                                 )}
                             </ul>
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            /* --- FALLBACK: AGGREGATE LEDGER (Old View) --- */
            <>
                <div className="grid grid-cols-3 gap-1 p-8 bg-slate-200 print:bg-white print:grid-cols-3 print:gap-4 print:p-8">
                    <div className="bg-white p-6 rounded shadow-sm border border-slate-300 print:border-black print:shadow-none">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-bold uppercase tracking-wider print:text-black">
                        <AlertTriangle className="w-4 h-4 text-amber-500 print:text-black" /> Total Blocked
                    </div>
                    <p className="text-4xl font-bold text-slate-900 print:text-black">{auditLogs.filter(l => l.status === 'BLOCKED').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded shadow-sm border border-slate-300 print:border-black print:shadow-none">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-bold uppercase tracking-wider print:text-black">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 print:text-black" /> Avg Compliance
                    </div>
                    <p className="text-4xl font-bold text-emerald-600 print:text-black">92%</p>
                    </div>
                    <div className="bg-white p-6 rounded shadow-sm border border-slate-300 print:border-black print:shadow-none">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-bold uppercase tracking-wider print:text-black">
                        <DollarSign className="w-4 h-4 text-blue-600 print:text-black" /> Liability Saved
                    </div>
                    <p className="text-4xl font-bold text-blue-600 print:text-black">$14.2M</p>
                    </div>
                </div>
                <div className="p-8 pt-0 flex-1 print:p-8">
                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-800 print:border-black">
                        <th className="py-3 px-2 font-bold uppercase text-xs tracking-wider w-24 print:text-black">Time</th>
                        <th className="py-3 px-2 font-bold uppercase text-xs tracking-wider w-24 print:text-black">Mode</th>
                        <th className="py-3 px-2 font-bold uppercase text-xs tracking-wider print:text-black">Details</th>
                        <th className="py-3 px-2 font-bold uppercase text-xs tracking-wider print:text-black">Status</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-sm">
                        {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-300 hover:bg-white transition-colors print:border-gray-300">
                            <td className="py-3 px-2 text-slate-600 whitespace-nowrap print:text-black">{log.time}</td>
                            <td className="py-3 px-2"><span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold print:border print:border-black print:bg-white print:text-black">{log.mode}</span></td>
                            <td className="py-3 px-2 text-slate-800 font-bold truncate max-w-[200px] print:text-black">{log.details}</td>
                            <td className={`py-3 px-2 font-bold print:text-black ${log.status === 'BLOCKED' ? 'text-red-600' : 'text-emerald-600'}`}>{log.status}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </>
          )}
          
          <div className="bg-slate-300 p-4 text-center text-xs text-slate-500 font-mono print:bg-white print:border-t print:border-black print:text-black flex justify-between items-center">
             <span>END OF REPORT // SRDO-AUDIT-SYS // DO NOT DISTRIBUTE</span>
             <span className="font-bold italic">"AtlasGuard doesn’t slow AI down. It makes safe AI move faster."</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditView;
