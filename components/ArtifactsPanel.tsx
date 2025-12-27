
import React, { useState, useEffect } from 'react';
import { RiskLevel, ProjectRequest } from '../types';
import { Lock, BarChart3, AlertTriangle, CheckCircle2, Database, Shield, Loader2, Download, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ArtifactsPanelProps {
  riskLevel: RiskLevel;
  showArtifacts: boolean;
  artifactsLoading: boolean;
  hasPiiViolation: boolean;
  projectRequest: ProjectRequest;
}

const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ 
  riskLevel, 
  showArtifacts, 
  artifactsLoading,
  hasPiiViolation,
  projectRequest
}) => {
  const isHighRisk = riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;
  
  // Synthetic Data State
  const [syntheticProgress, setSyntheticProgress] = useState(0);
  const [syntheticData, setSyntheticData] = useState<any>(null);
  
  // GenAI Media State
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [isGeneratingHeatmap, setIsGeneratingHeatmap] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  
  // Trigger Heatmap Generation automatically when artifacts are unlocked and it's high risk
  useEffect(() => {
    if (showArtifacts && isHighRisk && !heatmapUrl && !isGeneratingHeatmap) {
        generateHeatmap();
    }
  }, [showArtifacts, isHighRisk]);

  const generateHeatmap = async () => {
      setIsGeneratingHeatmap(true);
      setHeatmapError(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                  parts: [{ 
                      text: `Generate a highly detailed, dark-themed cybersecurity impact heatmap for a project named "${projectRequest.projectName}". 
                             Visual style: Cyberpunk dashboard, dark blue background with intense neon red "hotspots" scattered across a network graph map.
                             The red zones should look like digital corruption or data leaks. 
                             Overlay technical HUD elements and grid lines. High contrast, warning aesthetic.` 
                  }]
              }
          });
          
          let found = false;
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    setHeatmapUrl(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    found = true;
                    break;
                }
            }
          }
          if (!found) {
              setHeatmapError("API did not return image data.");
          }
      } catch (e) {
          console.error("Heatmap generation failed", e);
          setHeatmapError("Generation failed (API Error).");
      } finally {
          setIsGeneratingHeatmap(false);
      }
  };

  const startSyntheticGen = () => {
    let p = 0;
    const int = setInterval(() => {
        p += 5;
        setSyntheticProgress(p);
        if (p >= 100) {
            clearInterval(int);
            // Generate mock safe JSON
            const safeJson = {
                dataset_id: `SYNTH-${Date.now().toString().slice(-6)}`,
                project: projectRequest.projectName,
                status: "SANITIZED",
                compliance_standard: "ISO-27001",
                generated_at: new Date().toISOString(),
                records: Array.from({ length: 5 }).map((_, i) => ({
                    id: i + 1,
                    user_hash: `anon_${Math.random().toString(36).substring(7)}`,
                    location_zone: `Zone-${['A','B','C'][i%3]}`,
                    behavior_score: Math.random().toFixed(2)
                })),
                metadata: {
                    source: "AtlasGuard Synthetic Foundry v1",
                    privacy_mechanism: "Differential Privacy (Epsilon 0.5)"
                }
            };
            setSyntheticData(safeJson);
        }
    }, 50);
  };

  const downloadJson = () => {
      if (!syntheticData) {
          console.warn("No synthetic data to download");
          return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(syntheticData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `AtlasGuard_Safe_Data_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  if (!showArtifacts) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/20">
        <Lock className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm font-mono text-center">ARTIFACT GENERATION LOCKED</p>
        <p className="text-xs text-center mt-2 opacity-60">Complete analysis to unlock multimodal artifacts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top: Visual Risk Heatmap */}
      <div className="h-1/3 min-h-[160px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative group">
        <div className="absolute top-0 left-0 p-3 w-full bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between">
            <span className="text-[10px] font-mono text-blue-400 uppercase flex items-center gap-2">
                <BarChart3 className="w-3 h-3" />
                Impact Heatmap (Imagen 3)
            </span>
        </div>
        
        {artifactsLoading || isGeneratingHeatmap ? (
             <div className="h-full flex items-center justify-center bg-slate-950">
                 <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="text-[10px] text-blue-400 font-mono animate-pulse">
                        {artifactsLoading ? "ANALYZING..." : "GENERATING HEATMAP..."}
                    </span>
                 </div>
             </div>
        ) : (
            <div className="h-full w-full relative">
                {isHighRisk ? (
                    heatmapUrl ? (
                         <img src={heatmapUrl} alt="Risk Heatmap" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                    ) : (
                        // Fallback if generation failed but state is loaded
                        <div className="h-full w-full flex items-center justify-center bg-red-950/20 flex-col">
                             <AlertTriangle className="w-8 h-8 text-red-500/50 mb-2" />
                             <span className="text-[10px] text-red-500">VISUALIZATION FAILED</span>
                             {heatmapError && <span className="text-[9px] text-red-400/70 mt-1">{heatmapError}</span>}
                             <button onClick={generateHeatmap} className="mt-2 text-[10px] bg-red-900/50 px-2 py-1 rounded text-red-300 hover:bg-red-800/50">Retry</button>
                        </div>
                    )
                ) : (
                     <div className="h-full w-full flex items-center justify-center bg-emerald-950/20">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                        <span className="text-[10px] text-emerald-500 ml-2 font-mono">NO VISUAL RISKS DETECTED</span>
                     </div>
                )}
                
                {/* Overlays for High Risk */}
                {isHighRisk && heatmapUrl && (
                    <div className="absolute bottom-4 left-4 flex gap-2">
                         <span className="text-[10px] text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-900 backdrop-blur-sm">PII_HOTSPOT</span>
                         <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-900 backdrop-blur-sm">GDPR_RISK</span>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Middle: Synthetic Data Foundry (Active only if PII violation) */}
      {hasPiiViolation && isHighRisk && (
          <div className="flex-1 bg-slate-900 border border-purple-500/30 rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <div className="absolute top-0 left-0 p-3 w-full bg-slate-900/90 border-b border-purple-500/20 z-10 flex justify-between items-center">
                <span className="text-[10px] font-mono text-purple-400 uppercase flex items-center gap-2">
                    <Database className="w-3 h-3" />
                    Synthetic Data Foundry
                </span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 rounded">ISO 27001</span>
            </div>
            
            <div className="p-4 pt-12 h-full flex flex-col justify-center">
                {syntheticProgress === 0 ? (
                    <div className="text-center space-y-3">
                        <p className="text-xs text-slate-400">High Risk PII detected in source. Generate an anonymized compliant dataset?</p>
                        <button 
                            onClick={startSyntheticGen}
                            className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-200 rounded text-xs font-mono uppercase transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Generate Safe Dataset
                        </button>
                    </div>
                ) : syntheticProgress < 100 ? (
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-purple-400">
                            <span>TRANSFORMING_VECTORS...</span>
                            <span>{syntheticProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 transition-all duration-100 ease-linear"
                                style={{ width: `${syntheticProgress}%` }}
                            ></div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-3 animate-fade-in">
                        <Shield className="w-8 h-8 text-emerald-400 mx-auto" />
                        <p className="text-xs text-emerald-400 font-bold">Dataset Sanitized</p>
                        <button 
                            onClick={downloadJson}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 z-20 relative cursor-pointer"
                        >
                            <Download className="w-3 h-3" />
                            Download .JSON (Safe)
                        </button>
                    </div>
                )}
            </div>
          </div>
      )}
    </div>
  );
};

export default ArtifactsPanel;
